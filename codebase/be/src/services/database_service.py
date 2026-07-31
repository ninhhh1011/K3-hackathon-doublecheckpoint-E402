from typing import Any

import numpy as np

from src.core.config import settings
from src.models.db_models import (
    ChatQAEmbeddingRecord,
    ChatQARecord,
    TranscriptChunkEmbeddingRecord,
    TranscriptChunkRecord,
)


class DatabaseService:
    def connect(self) -> Any:
        import psycopg
        from pgvector.psycopg import register_vector

        connection = psycopg.connect(
            host=settings.db_host,
            port=settings.db_port,
            dbname=settings.db_name,
            user=settings.db_user,
            password=settings.db_password,
        )
        register_vector(connection)
        return connection

    def fetch_chat_qa_by_ids(self, ids: list[int]) -> list[ChatQARecord]:
        if not ids:
            return []
        with self.connect() as connection, connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT id, message_id, content_student, content_tutor, created_at
                FROM chat_qa
                WHERE id = ANY(%s)
                ORDER BY id
                """,
                (ids,),
            )
            return [
                ChatQARecord(
                    id=row[0],
                    message_id=row[1],
                    content_student=row[2],
                    content_tutor=row[3],
                    created_at=row[4],
                )
                for row in cursor.fetchall()
            ]

    def fetch_transcript_chunks_by_ids(self, ids: list[str]) -> list[TranscriptChunkRecord]:
        if not ids:
            return []
        with self.connect() as connection, connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT id, day_id, title, content, created_at
                FROM transcript_chunks
                WHERE id = ANY(%s)
                ORDER BY day_id, id
                """,
                (ids,),
            )
            return [
                TranscriptChunkRecord(
                    id=row[0],
                    day_id=row[1],
                    title=row[2],
                    content=row[3],
                    created_at=row[4],
                )
                for row in cursor.fetchall()
            ]

    def fetch_chat_qa_embeddings(self, limit: int = 10) -> list[ChatQAEmbeddingRecord]:
        with self.connect() as connection, connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT id, chat_qa_id, embedding_vector
                FROM chat_qa_embedding
                ORDER BY id
                LIMIT %s
                """,
                (limit,),
            )
            return [
                ChatQAEmbeddingRecord(
                    id=row[0],
                    chat_qa_id=row[1],
                    embedding_vector=list(row[2]),
                )
                for row in cursor.fetchall()
            ]

    def fetch_transcript_chunk_embeddings(self, limit: int = 10) -> list[TranscriptChunkEmbeddingRecord]:
        with self.connect() as connection, connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT id, transcript_chunk_id, embedding_vector
                FROM transcript_chunks_embedding
                ORDER BY id
                LIMIT %s
                """,
                (limit,),
            )
            return [
                TranscriptChunkEmbeddingRecord(
                    id=row[0],
                    transcript_chunk_id=row[1],
                    embedding_vector=list(row[2]),
                )
                for row in cursor.fetchall()
            ]

    def keyword_search(self, query: str, top_k: int) -> list[dict[str, Any]]:
        normalized = query.strip()
        if not normalized:
            return []

        like_query = f"%{normalized}%"
        with self.connect() as connection, connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    'chat_qa' AS source_type,
                    id::text AS source_id,
                    content_student AS content,
                    content_tutor AS extra_content,
                    0.5 AS score
                FROM chat_qa
                WHERE content_student ILIKE %s OR content_tutor ILIKE %s
                LIMIT %s
                """,
                (like_query, like_query, top_k),
            )
            chat_rows = cursor.fetchall()

            cursor.execute(
                """
                SELECT
                    'transcript' AS source_type,
                    id AS source_id,
                    content AS content,
                    COALESCE(title, '') AS extra_content,
                    0.5 AS score
                FROM transcript_chunks
                WHERE content ILIKE %s OR COALESCE(title, '') ILIKE %s
                LIMIT %s
                """,
                (like_query, like_query, top_k),
            )
            transcript_rows = cursor.fetchall()

        rows = chat_rows + transcript_rows
        return [
            {
                "source_type": str(row[0]),
                "source_id": str(row[1]),
                "content": str(row[2] or "").strip(),
                "extra_content": str(row[3] or "").strip(),
                "score": float(row[4]),
            }
            for row in rows
        ][:top_k]

    def hybrid_search_documents(self, query: str, embedding: np.ndarray) -> list[dict[str, object]]:
        from pgvector import Vector

        candidate_limit = max(settings.vlearn_rag_top_k, 1)
        seed_limit = max(candidate_limit * 2, 6)
        rows: list[dict[str, object]] = []

        with self.connect() as connection, connection.cursor() as cursor:
            query_vector = Vector(embedding)

            cursor.execute(
                """
                SELECT
                    'chat_qa' AS source_type,
                    c.id::text AS source_id,
                    c.content_student AS content,
                    c.content_tutor AS extra_content,
                    1 - (e.embedding_vector <=> %s) AS cosine_score,
                    0.0 AS bm25_score,
                    'vector' AS retrieval_method
                FROM chat_qa_embedding e
                JOIN chat_qa c ON c.id = e.chat_qa_id
                ORDER BY e.embedding_vector <=> %s
                LIMIT %s
                """,
                (query_vector, query_vector, seed_limit),
            )
            rows.extend(self._normalize_hybrid_rows(cursor.fetchall()))

            cursor.execute(
                """
                SELECT
                    'transcript' AS source_type,
                    t.id AS source_id,
                    t.content AS content,
                    COALESCE(t.title, '') AS extra_content,
                    1 - (e.embedding_vector <=> %s) AS cosine_score,
                    0.0 AS bm25_score,
                    'vector' AS retrieval_method
                FROM transcript_chunks_embedding e
                JOIN transcript_chunks t ON t.id = e.transcript_chunk_id
                ORDER BY e.embedding_vector <=> %s
                LIMIT %s
                """,
                (query_vector, query_vector, seed_limit),
            )
            rows.extend(self._normalize_hybrid_rows(cursor.fetchall()))

            ts_query = self._build_ts_query(cursor, query)
            if ts_query is not None:
                cursor.execute(
                    """
                    SELECT
                        'chat_qa' AS source_type,
                        c.id::text AS source_id,
                        c.content_student AS content,
                        c.content_tutor AS extra_content,
                        0.0 AS cosine_score,
                        ts_rank_cd(
                            to_tsvector('simple', coalesce(c.content_student, '') || ' ' || coalesce(c.content_tutor, '')),
                            %s
                        ) AS bm25_score,
                        'bm25' AS retrieval_method
                    FROM chat_qa c
                    WHERE to_tsvector('simple', coalesce(c.content_student, '') || ' ' || coalesce(c.content_tutor, '')) @@ %s
                    ORDER BY bm25_score DESC
                    LIMIT %s
                    """,
                    (ts_query, ts_query, seed_limit),
                )
                rows.extend(self._normalize_hybrid_rows(cursor.fetchall()))

                cursor.execute(
                    """
                    SELECT
                        'transcript' AS source_type,
                        t.id AS source_id,
                        t.content AS content,
                        COALESCE(t.title, '') AS extra_content,
                        0.0 AS cosine_score,
                        ts_rank_cd(
                            to_tsvector('simple', coalesce(t.title, '') || ' ' || coalesce(t.content, '')),
                            %s
                        ) AS bm25_score,
                        'bm25' AS retrieval_method
                    FROM transcript_chunks t
                    WHERE to_tsvector('simple', coalesce(t.title, '') || ' ' || coalesce(t.content, '')) @@ %s
                    ORDER BY bm25_score DESC
                    LIMIT %s
                    """,
                    (ts_query, ts_query, seed_limit),
                )
                rows.extend(self._normalize_hybrid_rows(cursor.fetchall()))

        return self._merge_hybrid_results(rows)[:candidate_limit]

    def _normalize_hybrid_rows(self, rows: list[tuple[object, ...]]) -> list[dict[str, object]]:
        normalized: list[dict[str, object]] = []
        for source_type, source_id, content, extra_content, cosine_score, bm25_score, retrieval_method in rows:
            normalized.append(
                {
                    "source_type": str(source_type),
                    "source_id": str(source_id),
                    "content": str(content or "").strip(),
                    "extra_content": str(extra_content or "").strip(),
                    "cosine_score": max(0.0, min(1.0, float(cosine_score))),
                    "bm25_score": max(0.0, float(bm25_score)),
                    "retrieval_methods": [str(retrieval_method)],
                }
            )
        return normalized

    def _merge_hybrid_results(self, rows: list[dict[str, object]]) -> list[dict[str, object]]:
        merged: dict[tuple[str, str], dict[str, object]] = {}
        max_bm25 = max((float(row["bm25_score"]) for row in rows), default=0.0)

        for row in rows:
            key = (str(row["source_type"]), str(row["source_id"]))
            normalized_bm25 = (
                float(row["bm25_score"]) / max_bm25
                if max_bm25 > 0 and float(row["bm25_score"]) > 0
                else 0.0
            )

            if key not in merged:
                merged[key] = {
                    **row,
                    "bm25_score": normalized_bm25,
                    "combined_score": 0.0,
                }
                continue

            current = merged[key]
            current["cosine_score"] = max(float(current["cosine_score"]), float(row["cosine_score"]))
            current["bm25_score"] = max(float(current["bm25_score"]), normalized_bm25)
            current["retrieval_methods"] = sorted(
                set(current["retrieval_methods"]) | set(row["retrieval_methods"])
            )

        merged_rows = list(merged.values())
        for row in merged_rows:
            row["combined_score"] = (0.7 * float(row["cosine_score"])) + (
                0.3 * float(row["bm25_score"])
            )

        merged_rows.sort(key=lambda item: float(item["combined_score"]), reverse=True)
        return merged_rows

    def _build_ts_query(self, cursor: Any, query: str) -> Any | None:
        normalized_query = query.strip()
        if not normalized_query:
            return None
        cursor.execute("SELECT websearch_to_tsquery('simple', %s)", (normalized_query,))
        row = cursor.fetchone()
        return row[0] if row else None
