-- 1. Bật các extension cần thiết
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Bảng lưu dữ liệu Chat Q&A
CREATE TABLE IF NOT EXISTS chat_qa (
    id BIGSERIAL PRIMARY KEY,                     -- Đổi sang BIGSERIAL để tự tăng ID
    message_id VARCHAR(100) NOT NULL UNIQUE,       -- Đã tự động tạo Unique Index
    content_student TEXT NOT NULL,
    content_tutor TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Bảng lưu Transcript Chunks
CREATE TABLE IF NOT EXISTS transcript_chunks (
    id VARCHAR(20) PRIMARY KEY,
    day_id SMALLINT NOT NULL,
    title TEXT,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index hỗ trợ filter nhanh theo day_id
CREATE INDEX IF NOT EXISTS idx_transcript_chunks_day_id
    ON transcript_chunks (day_id);

-- 4. Bảng lưu Embedding của Transcript Chunks
CREATE TABLE IF NOT EXISTS transcript_chunks_embedding (
    id BIGSERIAL PRIMARY KEY,
    transcript_chunk_id VARCHAR(20) NOT NULL UNIQUE
        REFERENCES transcript_chunks(id)
        ON DELETE CASCADE,
    embedding_vector VECTOR(1024) NOT NULL        -- Sửa thành 1024 nếu dùng E5 Large / BGE-M3
);

-- 5. Bảng lưu Embedding của Chat Q&A
CREATE TABLE IF NOT EXISTS chat_qa_embedding (
    id BIGSERIAL PRIMARY KEY,
    chat_qa_id BIGINT NOT NULL UNIQUE
        REFERENCES chat_qa(id)
        ON DELETE CASCADE,
    embedding_vector VECTOR(1024) NOT NULL        -- Sửa thành 1024 nếu dùng E5 Large / BGE-M3
);

-- 6. Tạo HNSW Index cho Vector Search (Cosine Similarity)
CREATE INDEX IF NOT EXISTS idx_transcript_embedding_hnsw
    ON transcript_chunks_embedding
    USING hnsw (embedding_vector vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS idx_chat_qa_embedding_hnsw
    ON chat_qa_embedding
    USING hnsw (embedding_vector vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);