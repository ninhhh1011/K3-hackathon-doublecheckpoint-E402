import json
from dataclasses import dataclass
from typing import Literal

from openai import AsyncOpenAI

from src.core.config import settings
from src.core.logging import logger
from src.models.schemas import ChatRequest

RouteIntent = Literal["chat", "agent"]


@dataclass(frozen=True)
class GuardrailRouteResult:
    route: RouteIntent
    reason: str
    model: str
    fallback: bool = False


@dataclass(frozen=True)
class GuardrailOutputResult:
    response: str
    allowed: bool
    reason: str
    model: str
    fallback: bool = False


class GuardrailService:
    def __init__(self) -> None:
        self._client = AsyncOpenAI(api_key=settings.openai_api_key) if settings.openai_api_key else None

    async def shutdown(self) -> None:
        if self._client:
            await self._client.close()

    async def route_intent(self, payload: ChatRequest) -> GuardrailRouteResult:
        fallback_route = self._fallback_route(payload)
        if not self._client:
            return GuardrailRouteResult(
                route=fallback_route,
                reason="OPENAI_API_KEY is missing; used deterministic routing fallback.",
                model=settings.vlearn_input_guardrail_model,
                fallback=True,
            )

        prompt = {
            "message": payload.message,
            "has_contexts": bool(payload.contexts),
            "attachment_kinds": [attachment.kind for attachment in payload.attachments],
            "selected_text": bool(payload.selected_text),
            "history_turn_count": len(payload.history),
        }
        try:
            response = await self._client.chat.completions.create(
                model=settings.vlearn_input_guardrail_model,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "Classify the request for a Vietnamese learning assistant. "
                            "Return JSON only: {\"route\":\"chat\"|\"agent\",\"reason\":\"...\"}. "
                            "Use chat for direct explanation, summary, Q&A, and normal tutoring. "
                            "Use agent when the request likely needs tools, retrieval, generated artifacts, "
                            "mind maps, document search, or multi-step work."
                        ),
                    },
                    {"role": "user", "content": json.dumps(prompt, ensure_ascii=False)},
                ],
                response_format={"type": "json_object"},
            )
            content = response.choices[0].message.content or "{}"
            data = json.loads(content)
            route = data.get("route")
            if route not in {"chat", "agent"}:
                raise ValueError(f"Invalid route: {route}")
            reason = data.get("reason")
            return GuardrailRouteResult(
                route=route,
                reason=reason if isinstance(reason, str) and reason.strip() else "Model classified route.",
                model=settings.vlearn_input_guardrail_model,
            )
        except Exception:
            logger.exception("Input guardrail routing failed")
            return GuardrailRouteResult(
                route=fallback_route,
                reason="Input guardrail failed; used deterministic routing fallback.",
                model=settings.vlearn_input_guardrail_model,
                fallback=True,
            )

    async def check_output(self, response_text: str, payload: ChatRequest) -> GuardrailOutputResult:
        if not response_text.strip():
            return GuardrailOutputResult(
                response="Mình chưa tạo được câu trả lời phù hợp từ ngữ cảnh hiện có.",
                allowed=False,
                reason="Empty response was replaced.",
                model=settings.vlearn_output_guardrail_model,
                fallback=True,
            )
        if not self._client:
            return GuardrailOutputResult(
                response=response_text,
                allowed=True,
                reason="OPENAI_API_KEY is missing; output guardrail allowed deterministic response.",
                model=settings.vlearn_output_guardrail_model,
                fallback=True,
            )

        prompt = {
            "user_message": payload.message,
            "response": response_text,
        }
        try:
            response = await self._client.chat.completions.create(
                model=settings.vlearn_output_guardrail_model,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "Review the assistant response for a Vietnamese learning assistant. "
                            "Return JSON only: {\"allowed\":boolean,\"response\":\"...\",\"reason\":\"...\"}. "
                            "Preserve helpful educational content. Rewrite only if unsafe, unsupported, "
                            "or if it claims unavailable context."
                        ),
                    },
                    {"role": "user", "content": json.dumps(prompt, ensure_ascii=False)},
                ],
                response_format={"type": "json_object"},
            )
            content = response.choices[0].message.content or "{}"
            data = json.loads(content)
            allowed = bool(data.get("allowed", True))
            checked_response = data.get("response")
            reason = data.get("reason")
            return GuardrailOutputResult(
                response=checked_response.strip()
                if isinstance(checked_response, str) and checked_response.strip()
                else response_text,
                allowed=allowed,
                reason=reason if isinstance(reason, str) and reason.strip() else "Output checked.",
                model=settings.vlearn_output_guardrail_model,
            )
        except Exception:
            logger.exception("Output guardrail failed")
            return GuardrailOutputResult(
                response=response_text,
                allowed=True,
                reason="Output guardrail failed; original response was returned.",
                model=settings.vlearn_output_guardrail_model,
                fallback=True,
            )

    def _fallback_route(self, payload: ChatRequest) -> RouteIntent:
        message = payload.message.lower()
        agent_keywords = (
            "mindmap",
            "mind map",
            "sơ đồ",
            "so do",
            "quiz",
            "trắc nghiệm",
            "trac nghiem",
            "tạo câu hỏi",
            "tao cau hoi",
            "tìm tài liệu",
            "tim tai lieu",
            "search",
            "tra cứu",
            "tra cuu",
        )
        if any(keyword in message for keyword in agent_keywords):
            return "agent"
        return "chat"
