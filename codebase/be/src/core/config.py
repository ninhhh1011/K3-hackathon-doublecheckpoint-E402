from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "VinAIAction API"
    app_version: str = "0.1.0"
    app_env: Literal["development", "staging", "production"] = "development"
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = "INFO"
    api_prefix: str = "/api/v1"
    allowed_origins: list[str] = Field(
        default_factory=lambda: ["http://localhost:3000", "http://localhost:5173"]
    )
    openai_api_key: str = Field(default="", alias="OPENAI_API_KEY")
    openai_model: str = "gpt-4o-mini"
    vlearn_head_model: str = Field(default="gpt-4o-mini", alias="VLEARN_HEAD_MODEL")
    vlearn_agent_model: str = Field(default="gpt-4.1", alias="VLEARN_AGENT_MODEL")
    vlearn_embedding_model: str = Field(
        default="text-embedding-3-small",
        alias="VLEARN_EMBEDDING_MODEL",
    )
    vlearn_docling_model: str = Field(default="docling-light-pdf", alias="VLEARN_DOCLING_MODEL")
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
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

