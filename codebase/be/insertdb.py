import csv
import os
from pathlib import Path
from typing import Iterator, Sequence, TypeVar

import numpy as np
import psycopg
from dotenv import load_dotenv
from pgvector import Vector
from pgvector.psycopg import register_vector
from sentence_transformers import SentenceTransformer


load_dotenv()

# ============================================================
# Cấu hình từ .env
# ============================================================
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = int(os.getenv("DB_PORT", "6666"))  # Sửa thành 6666 để match với docker-compose
DB_NAME = os.getenv("DB_NAME", "vlearn")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "postgres")

# Đường dẫn tương đối từ thư mục codebase/be
CHAT_CSV_PATH = Path("../../data/vlearn-pack/chatlog/chat_qa_mapped.csv")
TRANSCRIPT_CSV_PATH = Path("../../data/vlearn-pack/transcript/transcript_mapped.csv")

MODEL_NAME = os.getenv(
    "EMBEDDING_MODEL",
    "intfloat/multilingual-e5-large-instruct",
)

EMBEDDING_DIM = int(os.getenv("EMBEDDING_DIM", "1024"))
BATCH_SIZE = int(os.getenv("EMBEDDING_BATCH_SIZE", "8"))
DEVICE = os.getenv("EMBEDDING_DEVICE", "").strip()  # cpu, cuda hoặc để rỗng


T = TypeVar("T")


def chunked(items: Sequence[T], size: int) -> Iterator[Sequence[T]]:
    """Chia danh sách thành các batch nhỏ."""
    for start in range(0, len(items), size):
        yield items[start : start + size]


def require_file(path: Path) -> None:
    if not path.exists():
        raise FileNotFoundError(
            f"Không tìm thấy file: {path.resolve()}"
        )


def clean_text(value: str | None) -> str:
    return (value or "").strip()


def log_skipped_row(
    dataset_name: str,
    csv_line: int,
    reason: str,
) -> None:
    print(
        f"[SKIP] {dataset_name} dòng {csv_line}: {reason}"
    )


def validate_columns(
    reader: csv.DictReader,
    required_columns: set[str],
    file_path: Path,
) -> None:
    actual_columns = set(reader.fieldnames or [])

    if not required_columns.issubset(actual_columns):
        raise ValueError(
            f"File {file_path} sai cấu trúc.\n"
            f"Cần: {sorted(required_columns)}\n"
            f"Hiện có: {sorted(actual_columns)}"
        )



def first_present_value(
    row: dict[str, str | None],
    candidate_columns: Sequence[str],
) -> str:
    for column_name in candidate_columns:
        if column_name in row:
            return clean_text(row[column_name])
    return ""

def parse_int_or_none(value: str | None) -> int | None:
    cleaned = clean_text(value)
    if not cleaned:
        return None
    return int(cleaned)


def connect_database() -> psycopg.Connection:
    print(
        f"Kết nối PostgreSQL: "
        f"{DB_HOST}:{DB_PORT}/{DB_NAME}"
    )

    connection = psycopg.connect(
        host=DB_HOST,
        port=DB_PORT,
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
    )

    # Cho phép psycopg gửi/nhận kiểu VECTOR của pgvector.
    register_vector(connection)

    return connection


def check_database_schema(connection: psycopg.Connection) -> None:
    """Kiểm tra 4 bảng cần thiết đã được tạo bởi init.sql."""
    required_tables = [
        "chat_qa",
        "transcript_chunks",
        "chat_qa_embedding",
        "transcript_chunks_embedding",
    ]

    with connection.cursor() as cursor:
        for table_name in required_tables:
            cursor.execute(
                "SELECT to_regclass(%s)",
                (f"public.{table_name}",),
            )

            if cursor.fetchone()[0] is None:
                raise RuntimeError(
                    f"Chưa có bảng '{table_name}'. "
                    "Hãy chạy init.sql trước."
                )


def insert_chat_qa(
    connection: psycopg.Connection,
) -> list[tuple[int, str]]:
    """
    Insert từng dòng chat CSV.

    Trả về:
        [(chat_qa_id trong DB, content_student), ...]
    """
    require_file(CHAT_CSV_PATH)

    records_for_embedding: list[tuple[int, str]] = []

    with CHAT_CSV_PATH.open(
        "r",
        encoding="utf-8-sig",
        newline="",
    ) as file:
        reader = csv.DictReader(file)

        validate_columns(
            reader,
            {
                "id",
                "message_id",
            },
            CHAT_CSV_PATH,
        )

        actual_columns = set(reader.fieldnames or [])
        student_columns = ["question_student", "content_student"]
        tutor_columns = ["answer_tutor", "content_tutor"]

        if not any(column in actual_columns for column in student_columns):
            raise ValueError(
                "File chat thi?u c?t c?u h?i c?a sinh vi?n. "
                f"K? v?ng m?t trong c?c c?t: {student_columns}"
            )

        if not any(column in actual_columns for column in tutor_columns):
            raise ValueError(
                "File chat thi?u c?t c?u tr? l?i c?a tutor. "
                f"K? v?ng m?t trong c?c c?t: {tutor_columns}"
            )

        with connection.cursor() as cursor:
            for csv_line, row in enumerate(reader, start=2):
                message_id = clean_text(row["message_id"])
                content_student = first_present_value(row, student_columns)
                content_tutor = first_present_value(row, tutor_columns)
                source_id = parse_int_or_none(row["id"])

                if (
                    source_id is None
                    and not message_id
                    and not content_student
                    and not content_tutor
                ):
                    log_skipped_row(
                        "Chat CSV",
                        csv_line,
                        "dòng rỗng hoàn toàn",
                    )
                    continue

                if source_id is None:
                    log_skipped_row(
                        "Chat CSV",
                        csv_line,
                        "id rỗng hoặc không hợp lệ",
                    )
                    continue

                if not message_id:
                    log_skipped_row(
                        "Chat CSV",
                        csv_line,
                        "message_id rỗng",
                    )
                    continue

                # Nếu content_student rỗng, lấy content_tutor bù vào (và ngược lại)
                if not content_student and content_tutor:
                    content_student = content_tutor
                elif not content_tutor and content_student:
                    content_tutor = content_student

                # Sau khi bù, nếu vẫn không có nội dung nào, bỏ qua
                if not content_student and not content_tutor:
                    log_skipped_row(
                        "Chat CSV",
                        csv_line,
                        "cả content_student và content_tutor đều rỗng",
                    )
                    continue

                cursor.execute(
                    """
                    INSERT INTO chat_qa (
                        id,
                        message_id,
                        content_student,
                        content_tutor
                    )
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT (id) DO UPDATE SET
                        message_id = EXCLUDED.message_id,
                        content_student = EXCLUDED.content_student,
                        content_tutor = EXCLUDED.content_tutor
                    RETURNING id
                    """,
                    (
                        source_id,
                        message_id,
                        content_student,
                        content_tutor,
                    ),
                )

                database_id = cursor.fetchone()[0]

                records_for_embedding.append(
                    (database_id, content_student)
                )

    # Đồng bộ sequence sau khi insert ID từ CSV vào cột BIGSERIAL.
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT setval(
                pg_get_serial_sequence('chat_qa', 'id'),
                COALESCE((SELECT MAX(id) FROM chat_qa), 1),
                true
            )
            """
        )

    connection.commit()

    print(
        f"Đã insert/update {len(records_for_embedding)} "
        "dòng vào chat_qa"
    )

    return records_for_embedding


def insert_transcript_chunks(
    connection: psycopg.Connection,
) -> list[tuple[str, str]]:
    """
    Insert từng dòng transcript CSV.

    Trả về:
        [(transcript_chunk_id, content), ...]
    """
    require_file(TRANSCRIPT_CSV_PATH)

    records_for_embedding: list[tuple[str, str]] = []

    with TRANSCRIPT_CSV_PATH.open(
        "r",
        encoding="utf-8-sig",
        newline="",
    ) as file:
        reader = csv.DictReader(file)

        validate_columns(
            reader,
            {"id", "day_id", "title", "content"},
            TRANSCRIPT_CSV_PATH,
        )

        with connection.cursor() as cursor:
            for csv_line, row in enumerate(reader, start=2):
                transcript_id = clean_text(row["id"])
                day_id = parse_int_or_none(row["day_id"])
                title = clean_text(row["title"]) or None
                content = clean_text(row["content"])

                if not transcript_id and day_id is None and not title and not content:
                    log_skipped_row(
                        "Transcript CSV",
                        csv_line,
                        "dòng rỗng hoàn toàn",
                    )
                    continue

                if not transcript_id:
                    log_skipped_row(
                        "Transcript CSV",
                        csv_line,
                        "id rỗng",
                    )
                    continue

                if day_id is None:
                    log_skipped_row(
                        "Transcript CSV",
                        csv_line,
                        "day_id rỗng hoặc không hợp lệ",
                    )
                    continue

                if not content:
                    log_skipped_row(
                        "Transcript CSV",
                        csv_line,
                        "content rỗng",
                    )
                    continue

                cursor.execute(
                    """
                    INSERT INTO transcript_chunks (
                        id,
                        day_id,
                        title,
                        content
                    )
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT (id) DO UPDATE SET
                        day_id = EXCLUDED.day_id,
                        title = EXCLUDED.title,
                        content = EXCLUDED.content
                    """,
                    (
                        transcript_id,
                        day_id,
                        title,
                        content,
                    ),
                )

                records_for_embedding.append(
                    (transcript_id, content)
                )

    connection.commit()

    print(
        f"Đã insert/update {len(records_for_embedding)} "
        "dòng vào transcript_chunks"
    )

    return records_for_embedding


def load_embedding_model() -> SentenceTransformer:
    print(f"Đang tải embedding model: {MODEL_NAME}")

    if DEVICE:
        model = SentenceTransformer(
            MODEL_NAME,
            device=DEVICE,
        )
    else:
        model = SentenceTransformer(MODEL_NAME)

    # Model hỗ trợ tối đa 512 token cho mỗi văn bản.
    model.max_seq_length = 512

    print(
        f"Model đã sẵn sàng. Device: {model.device}"
    )

    return model


def encode_documents(
    model: SentenceTransformer,
    texts: list[str],
) -> np.ndarray:
    """
    Đây là document-side embedding nên giữ nguyên văn bản,
    không thêm Instruct/Query prefix.
    """
    embeddings = model.encode(
        texts,
        batch_size=BATCH_SIZE,
        show_progress_bar=False,
        convert_to_numpy=True,
        normalize_embeddings=True,
    )

    embeddings = np.asarray(
        embeddings,
        dtype=np.float32,
    )

    if embeddings.ndim != 2:
        raise RuntimeError(
            f"Embedding có shape không hợp lệ: "
            f"{embeddings.shape}"
        )

    if embeddings.shape[1] != EMBEDDING_DIM:
        raise RuntimeError(
            f"Model trả về {embeddings.shape[1]} chiều, "
            f"nhưng DB đang cấu hình VECTOR({EMBEDDING_DIM})."
        )

    return embeddings


def embed_and_save_transcripts(
    connection: psycopg.Connection,
    model: SentenceTransformer,
    records: list[tuple[str, str]],
) -> None:
    total = len(records)
    processed = 0

    for batch in chunked(records, BATCH_SIZE):
        ids = [item[0] for item in batch]
        texts = [item[1] for item in batch]

        embeddings = encode_documents(model, texts)

        values = [
            (
                transcript_id,
                Vector(embedding),
            )
            for transcript_id, embedding in zip(
                ids,
                embeddings,
                strict=True,
            )
        ]

        with connection.cursor() as cursor:
            cursor.executemany(
                """
                INSERT INTO transcript_chunks_embedding (
                    transcript_chunk_id,
                    embedding_vector
                )
                VALUES (%s, %s)
                ON CONFLICT (transcript_chunk_id)
                DO UPDATE SET
                    embedding_vector = EXCLUDED.embedding_vector
                """,
                values,
            )

        connection.commit()

        processed += len(batch)
        print(
            f"Transcript embedding: {processed}/{total}"
        )


def embed_and_save_chat_questions(
    connection: psycopg.Connection,
    model: SentenceTransformer,
    records: list[tuple[int, str]],
) -> None:
    total = len(records)
    processed = 0

    for batch in chunked(records, BATCH_SIZE):
        ids = [item[0] for item in batch]
        texts = [item[1] for item in batch]

        embeddings = encode_documents(model, texts)

        values = [
            (
                chat_qa_id,
                Vector(embedding),
            )
            for chat_qa_id, embedding in zip(
                ids,
                embeddings,
                strict=True,
            )
        ]

        with connection.cursor() as cursor:
            cursor.executemany(
                """
                INSERT INTO chat_qa_embedding (
                    chat_qa_id,
                    embedding_vector
                )
                VALUES (%s, %s)
                ON CONFLICT (chat_qa_id)
                DO UPDATE SET
                    embedding_vector = EXCLUDED.embedding_vector
                """,
                values,
            )

        connection.commit()

        processed += len(batch)
        print(
            f"Chat embedding: {processed}/{total}"
        )


def print_database_counts(
    connection: psycopg.Connection,
) -> None:
    tables = [
        "chat_qa",
        "chat_qa_embedding",
        "transcript_chunks",
        "transcript_chunks_embedding",
    ]

    print("\nSố record trong database:")

    with connection.cursor() as cursor:
        for table_name in tables:
            # table_name chỉ lấy từ danh sách cố định phía trên.
            cursor.execute(
                f"SELECT COUNT(*) FROM {table_name}"
            )
            count = cursor.fetchone()[0]
            print(f"- {table_name}: {count}")


def main() -> None:
    connection = connect_database()

    try:
        check_database_schema(connection)

        chat_records = insert_chat_qa(connection)
        transcript_records = insert_transcript_chunks(
            connection
        )

        model = load_embedding_model()

        embed_and_save_transcripts(
            connection,
            model,
            transcript_records,
        )

        embed_and_save_chat_questions(
            connection,
            model,
            chat_records,
        )

        print_database_counts(connection)

        print("\nHoàn tất insert và embedding dữ liệu.")

    except Exception:
        connection.rollback()
        raise

    finally:
        connection.close()


if __name__ == "__main__":
    main()
