from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_ROOT = Path(__file__).resolve().parents[2]


class DatabaseSettings(BaseSettings):
    host: str
    port: int
    name: str
    user: str
    password: str


class DoclingSettings(BaseSettings):
    model: str
    force_backend_text: bool
    do_ocr: bool
    do_table_structure: bool


class RAGSettings(BaseSettings):
    embedding_model: str
    embedding_dim: int
    embedding_device: str
    top_k: int
    score_threshold: float


class GuardrailSettings(BaseSettings):
    input_model: str
    output_model: str


class OpenAISettings(BaseSettings):
    api_key: str
    default_model: str
    head_model: str
    agent_model: str


class GeminiImageSettings(BaseSettings):
    api_key: str
    mindmap_image_model: str
    api_url: str


class Settings(BaseSettings):
    app_name: str = "VinAIAction API"
    app_version: str = "0.1.0"
    app_env: Literal["development", "staging", "production"] = "development"
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = "INFO"
    api_prefix: str = "/api/v1"
    allowed_origins: list[str] = Field(
        default_factory=lambda: [
            "http://localhost:3000",
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ]
    )
    openai_api_key: str = Field(default="", alias="OPENAI_API_KEY")
    openai_model: str = "gpt-4o-mini"
    vlearn_head_model: str = Field(default="gpt-4o-mini", alias="VLEARN_HEAD_MODEL")
    vlearn_agent_model: str = Field(default="gpt-4.1", alias="VLEARN_AGENT_MODEL")
    vlearn_embedding_model: str = Field(
        default="intfloat/multilingual-e5-large-instruct",
        alias="VLEARN_EMBEDDING_MODEL",
    )
    vlearn_embedding_dim: int = Field(default=1024, alias="VLEARN_EMBEDDING_DIM")
    vlearn_embedding_device: str = Field(default="", alias="VLEARN_EMBEDDING_DEVICE")
    vlearn_rag_top_k: int = Field(default=5, alias="VLEARN_RAG_TOP_K")
    vlearn_rag_score_threshold: float = Field(default=0.75, alias="VLEARN_RAG_SCORE_THRESHOLD")
    db_host: str = Field(default="localhost", alias="DB_HOST")
    db_port: int = Field(default=6666, alias="DB_PORT")
    db_name: str = Field(default="vlearn", alias="DB_NAME")
    db_user: str = Field(default="postgres", alias="DB_USER")
    db_password: str = Field(default="postgres", alias="DB_PASSWORD")
    vlearn_docling_model: str = Field(default="docling-light-pdf", alias="VLEARN_DOCLING_MODEL")
    gemini_api_key: str = Field(default="", alias="GEMINI_API_KEY")
    vlearn_mindmap_image_model: str = Field(
        default="gemini-3.1-flash-image",
        alias="VLEARN_MINDMAP_IMAGE_MODEL",
    )
    vlearn_mindmap_image_api_url: str = Field(
        default="https://framework-independently-blackberry-explaining.trycloudflare.com",
        alias="VLEARN_MINDMAP_IMAGE_API_URL",
    )
    vlearn_docling_force_backend_text: bool = Field(
        default=True,
        alias="VLEARN_DOCLING_FORCE_BACKEND_TEXT",
    )
    vlearn_docling_do_ocr: bool = Field(
        default=False,
        alias="VLEARN_DOCLING_DO_OCR",
    )
    vlearn_docling_do_table_structure: bool = Field(
        default=False,
        alias="VLEARN_DOCLING_DO_TABLE_STRUCTURE",
    )
    vlearn_input_guardrail_model: str = Field(
        default="gpt-4o-mini",
        alias="VLEARN_INPUT_GUARDRAIL_MODEL",
    )
    vlearn_output_guardrail_model: str = Field(
        default="gpt-4o-mini",
        alias="VLEARN_OUTPUT_GUARDRAIL_MODEL",
    )

    model_config = SettingsConfigDict(
        env_file=BACKEND_ROOT / ".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @property
    def database(self) -> DatabaseSettings:
        return DatabaseSettings(
            host=self.db_host,
            port=self.db_port,
            name=self.db_name,
            user=self.db_user,
            password=self.db_password,
        )

    @property
    def docling(self) -> DoclingSettings:
        return DoclingSettings(
            model=self.vlearn_docling_model,
            force_backend_text=self.vlearn_docling_force_backend_text,
            do_ocr=self.vlearn_docling_do_ocr,
            do_table_structure=self.vlearn_docling_do_table_structure,
        )

    @property
    def rag(self) -> RAGSettings:
        return RAGSettings(
            embedding_model=self.vlearn_embedding_model,
            embedding_dim=self.vlearn_embedding_dim,
            embedding_device=self.vlearn_embedding_device,
            top_k=self.vlearn_rag_top_k,
            score_threshold=self.vlearn_rag_score_threshold,
        )

    @property
    def guardrail(self) -> GuardrailSettings:
        return GuardrailSettings(
            input_model=self.vlearn_input_guardrail_model,
            output_model=self.vlearn_output_guardrail_model,
        )

    @property
    def openai(self) -> OpenAISettings:
        return OpenAISettings(
            api_key=self.openai_api_key,
            default_model=self.openai_model,
            head_model=self.vlearn_head_model,
            agent_model=self.vlearn_agent_model,
        )

    @property
    def gemini_image(self) -> GeminiImageSettings:
        return GeminiImageSettings(
            api_key=self.gemini_api_key,
            mindmap_image_model=self.vlearn_mindmap_image_model,
            api_url=self.vlearn_mindmap_image_api_url,
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

