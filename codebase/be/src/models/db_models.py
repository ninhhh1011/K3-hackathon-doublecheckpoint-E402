from datetime import datetime

from pydantic import BaseModel


class ChatQARecord(BaseModel):
    id: int
    message_id: str
    content_student: str
    content_tutor: str
    created_at: datetime


class TranscriptChunkRecord(BaseModel):
    id: str
    day_id: int
    title: str | None
    content: str
    created_at: datetime


class ChatQAEmbeddingRecord(BaseModel):
    id: int
    chat_qa_id: int
    embedding_vector: list[float]


class TranscriptChunkEmbeddingRecord(BaseModel):
    id: int
    transcript_chunk_id: str
    embedding_vector: list[float]
