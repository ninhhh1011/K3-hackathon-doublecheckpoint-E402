from openai import AsyncOpenAI

from src.core.config import settings
from src.core.logging import logger
from src.models.providers import ChatCompletionRequest, ChatMessage


class OpenAIChatService:
    def __init__(self) -> None:
        self._client = AsyncOpenAI(api_key=settings.openai_api_key) if settings.openai_api_key else None

    async def warmup(self) -> None:
        if self._client:
            logger.info("OpenAI client initialized for model %s", settings.vlearn_agent_model)
        else:
            logger.warning("OPENAI_API_KEY is missing, skipping remote model warmup.")

    async def shutdown(self) -> None:
        if self._client:
            await self._client.close()

    async def generate(
        self,
        system_prompt: str,
        user_prompt: str,
        fallback: str,
        model: str | None = None,
        json_output: bool = False,
    ) -> str:
        if not self._client:
            logger.warning("OPENAI_API_KEY is missing, using grounded fallback response.")
            return fallback

        request = ChatCompletionRequest(
            model=model or settings.vlearn_agent_model,
            messages=[
                ChatMessage(role="system", content=system_prompt),
                ChatMessage(role="user", content=user_prompt),
            ],
            response_format={"type": "json_object"} if json_output else None,
        )
        try:
            response = await self._client.chat.completions.create(**request.model_dump(exclude_none=True))
            content = response.choices[0].message.content
            if isinstance(content, str) and content.strip():
                return content.strip()
        except Exception:
            logger.exception("Failed to generate the tutor response")
        return fallback
