from datetime import UTC, datetime
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator, model_validator


def _clean_optional_text(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None


class BoundingBox(BaseModel):
    x: float = Field(ge=0)
    y: float = Field(ge=0)
    width: float = Field(gt=0)
    height: float = Field(gt=0)


class ChatContext(BaseModel):
    type: Literal["text", "image"]
    page_number: int = Field(ge=1)
    text: str | None = Field(default=None, max_length=10_000)
    image_data_url: str | None = Field(default=None, max_length=2_000_000)
    bounding_box: BoundingBox | None = None

    @field_validator("text")
    @classmethod
    def clean_text(cls, value: str | None) -> str | None:
        return _clean_optional_text(value)

    @field_validator("image_data_url")
    @classmethod
    def clean_image_data_url(cls, value: str | None) -> str | None:
        return _clean_optional_text(value)

    @model_validator(mode="after")
    def validate_payload_by_type(self) -> "ChatContext":
        if self.type == "text" and not self.text:
            raise ValueError("text context requires a non-empty text field")
        if self.type == "image" and not self.image_data_url:
            raise ValueError("image context requires a non-empty image_data_url field")
        return self


class TutorAttachment(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    kind: Literal["image", "pdf", "text", "other"]
    purpose: Literal["current_document", "attachment"] = "attachment"
    mime_type: str | None = Field(default=None, max_length=120)
    text_content: str | None = Field(default=None, max_length=20_000)
    image_data_url: str | None = Field(default=None, max_length=2_000_000)
    file_data_url: str | None = Field(default=None, max_length=40_000_000)

    @field_validator("name")
    @classmethod
    def clean_name(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Attachment name must not be empty.")
        return cleaned

    @field_validator("text_content")
    @classmethod
    def clean_text_content(cls, value: str | None) -> str | None:
        return _clean_optional_text(value)

    @field_validator("image_data_url")
    @classmethod
    def clean_attachment_image_data_url(cls, value: str | None) -> str | None:
        return _clean_optional_text(value)

    @field_validator("file_data_url")
    @classmethod
    def clean_file_data_url(cls, value: str | None) -> str | None:
        return _clean_optional_text(value)

    @model_validator(mode="after")
    def validate_attachment_payload(self) -> "TutorAttachment":
        if self.kind == "image" and not self.image_data_url:
            raise ValueError("image attachment requires image_data_url")
        if self.kind in {"pdf", "other"} and not self.file_data_url and not self.text_content:
            raise ValueError("document attachment requires file_data_url or text_content")
        return self


class ChatHistoryItem(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=10_000)

    @field_validator("content")
    @classmethod
    def clean_content(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("History content must not be empty.")
        return cleaned


class ChatRequest(BaseModel):
    message: str = Field(default="", max_length=5_000)
    conversation_id: str | None = Field(default=None, max_length=255)
    stream: bool = False
    quiz_request: Literal["none", "accept", "decline"] = "none"
    material_id: str | None = Field(default=None, max_length=255)
    page_number: int | None = Field(default=None, ge=1)
    source_ids: list[str] = Field(default_factory=list)
    selected_text: str | None = Field(default=None, max_length=10_000)
    history: list[ChatHistoryItem] = Field(default_factory=list, max_length=20)
    contexts: list[ChatContext] = Field(default_factory=list)
    attachments: list[TutorAttachment] = Field(default_factory=list, max_length=5)

    @field_validator("message")
    @classmethod
    def clean_message(cls, value: str) -> str:
        return value.strip()

    @field_validator("conversation_id")
    @classmethod
    def clean_conversation_id(cls, value: str | None) -> str | None:
        return _clean_optional_text(value)

    @field_validator("material_id")
    @classmethod
    def clean_material_id(cls, value: str | None) -> str | None:
        return _clean_optional_text(value)

    @field_validator("selected_text")
    @classmethod
    def clean_selected_text(cls, value: str | None) -> str | None:
        return _clean_optional_text(value)

    @model_validator(mode="after")
    def require_message_or_context(self) -> "ChatRequest":
        if (
            not self.message
            and not self.contexts
            and not self.attachments
            and self.quiz_request == "none"
        ):
            raise ValueError("Provide a message, at least one context item, or at least one attachment.")
        return self


class TraceEvent(BaseModel):
    type: Literal["node_start", "node_end", "tool_call", "tool_result", "message_delta", "final"]
    node_name: str | None = None
    payload: dict[str, Any] = Field(default_factory=dict)


class QuizArtifact(BaseModel):
    question: str
    choices: list[str] = Field(min_length=4, max_length=4)
    correctIndex: int = Field(ge=0, le=3)
    explanation: str
    citations: list[str] = Field(default_factory=list)


class MindmapImageArtifact(BaseModel):
    model: str
    image_data_url: str | None = None
    mime_type: str = "image/png"
    note: str = ""


class ChatResponse(BaseModel):
    response: str
    conversation_id: str
    sources: list[str] = Field(default_factory=list)
    quiz: QuizArtifact | None = None
    mindmap_image: MindmapImageArtifact | None = None
    quiz_offer: bool = False
    trace: list[TraceEvent] = Field(default_factory=list)
    timestamp: datetime = Field(default_factory=lambda: datetime.now(UTC))


class HealthResponse(BaseModel):
    status: str
    version: str
    environment: str


class MaterialResponse(BaseModel):
    id: str
    title: str
    courseCode: str
    pageNumber: int = Field(ge=1)
    pageCount: int = Field(ge=1)
    documentUrl: str | None = None
    sourceIds: list[str] = Field(default_factory=list)
