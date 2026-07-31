from typing import Any, Literal

from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: Literal["system", "user", "assistant"]
    content: str = Field(min_length=1)


class ChatCompletionRequest(BaseModel):
    model: str
    messages: list[ChatMessage]
    response_format: dict[str, Any] | None = None


class ImageGenerationResult(BaseModel):
    model: str
    image_data_url: str | None
    mime_type: str = "image/png"
    status: Literal["success", "unavailable", "error"]
    note: str
