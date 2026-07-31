import json
from typing import Any

from openai import OpenAI

from src.core.config import settings
from src.core.logging import logger
from src.models.providers import ChatCompletionRequest, ChatMessage

try:
    from langchain.tools import tool
except ImportError:

    def tool(func):
        def invoke(payload: dict[str, Any]) -> str:
            return func(**payload)

        func.invoke = invoke
        return func


def get_openai_client() -> OpenAI | None:
    if not settings.openai_api_key:
        return None
    return OpenAI(api_key=settings.openai_api_key)


def truncate_text(value: str, limit: int = 4000) -> str:
    cleaned = " ".join(value.split())
    if len(cleaned) <= limit:
        return cleaned
    return f"{cleaned[:limit].rstrip()}..."


def call_llm(
    *,
    system_prompt: str,
    user_prompt: str,
    json_output: bool = False,
    fallback: str | dict[str, Any],
) -> str:
    client = get_openai_client()
    if not client:
        return json.dumps(fallback, ensure_ascii=False) if isinstance(fallback, dict) else fallback

    try:
        request = ChatCompletionRequest(
            model=settings.openai_model,
            messages=[
                ChatMessage(role="system", content=system_prompt),
                ChatMessage(role="user", content=user_prompt),
            ],
            response_format={"type": "json_object"} if json_output else None,
        )
        response = client.chat.completions.create(**request.model_dump(exclude_none=True))
        content = response.choices[0].message.content
        if isinstance(content, str) and content.strip():
            return content.strip()
    except Exception:
        logger.exception("Tool LLM call failed")

    return json.dumps(fallback, ensure_ascii=False) if isinstance(fallback, dict) else fallback
