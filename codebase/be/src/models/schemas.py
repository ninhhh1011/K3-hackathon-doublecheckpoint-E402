from datetime import datetime, UTC

from pydantic import BaseModel, Field, field_validator


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=5000, description="User message")
    conversation_id: str | None = Field(default=None, description="Conversation identifier")
    stream: bool = Field(default=False, description="Whether to stream the response")

    @field_validator("message")
    @classmethod
    def clean_message(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Message must not be empty.")
        return cleaned


class ChatResponse(BaseModel):
    response: str
    conversation_id: str
    sources: list[str] = Field(default_factory=list)
    timestamp: datetime = Field(default_factory=lambda: datetime.now(UTC))


class HealthResponse(BaseModel):
    status: str
    version: str
    environment: str

