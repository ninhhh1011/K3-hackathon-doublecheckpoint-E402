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


class MaterialResponse(BaseModel):
    id: str
    title: str
    courseCode: str
    pageNumber: int = Field(ge=1)
    pageCount: int = Field(ge=1)
    documentUrl: str | None = None
    sourceIds: list[str] = Field(default_factory=list)


class TutorTurnRequest(BaseModel):
    sessionId: str
    materialId: str
    pageNumber: int = Field(ge=1)
    sourceIds: list[str] = Field(default_factory=list)
    selectedText: str | None = None
    message: str = Field(min_length=1, max_length=5000)

    @field_validator("message")
    @classmethod
    def clean_turn_message(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Message must not be empty.")
        return cleaned


class TutorMessage(BaseModel):
    id: str
    role: str
    content: str
    citations: list[str] = Field(default_factory=list)


class MindMapNode(BaseModel):
    id: str
    label: str
    citations: list[str] = Field(default_factory=list)


class MindMapEdge(BaseModel):
    source: str
    target: str
    label: str | None = None


class MindMap(BaseModel):
    rootId: str
    nodes: list[MindMapNode]
    edges: list[MindMapEdge]


class TutorTurnResponse(BaseModel):
    message: TutorMessage
    nextAction: str
    mindmap: MindMap | None = None


class QuizRequest(BaseModel):
    sessionId: str
    materialId: str
    pageNumber: int = Field(ge=1)
    sourceIds: list[str] = Field(default_factory=list)


class QuizResponse(BaseModel):
    question: str
    choices: list[str] = Field(min_length=3, max_length=3)
    correctIndex: int = Field(ge=0, le=2)
    explanation: str
    citations: list[str] = Field(default_factory=list)


class QuizDeclineRequest(BaseModel):
    sessionId: str
    materialId: str
    tutorTurnId: str

