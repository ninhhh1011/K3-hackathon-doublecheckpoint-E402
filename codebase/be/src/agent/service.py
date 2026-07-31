import json
from collections.abc import AsyncIterator
from datetime import UTC, datetime
from typing import Callable
from uuid import uuid4

from src.agent.langchain_factory import build_learning_agent
from src.core.config import settings
from src.core.logging import logger
from src.models.schemas import (
    ChatContext,
    ChatHistoryItem,
    ChatRequest,
    ChatResponse,
    MaterialResponse,
    MindmapImageArtifact,
    QuizArtifact,
    TraceEvent,
)
from src.services import DocumentService, GuardrailService, OpenAIChatService, RAGService
from src.services.guardrail_service import GuardrailOutputResult, GuardrailRouteResult
from src.tools.gen_mindmap import gen_mindmap
from src.tools.gen_mindmap_image import gen_mindmap_image
from src.tools.gen_question import gen_question

SYSTEM_PROMPT = """
Ban la VLearn Tutor, tro giang AI than thien cho sinh vien dai hoc.
Chi tra loi dua tren ngu canh duoc cung cap tu slide hien tai, doan van ban duoc chon,
anh va tai lieu dinh kem. Luon nhac so trang slide khi dung noi dung tu slide.
Neu du lieu khong du, noi ro gioi han thay vi boi them. Tra loi bang tieng Viet ro rang,
uu tien giai thich de hieu va co cau truc ngan gon.
""".strip()


class AgentService:
    """Coordinate chat flow, trace emission, and grounded context collection."""

    def __init__(self) -> None:
        self._document_service = DocumentService()
        self._llm_service = OpenAIChatService()
        self._rag_service = RAGService()
        self._guardrail_service = GuardrailService()

    async def warmup(self) -> None:
        await self._llm_service.warmup()

        try:
            await self._document_service.warmup()
            logger.info(
                "Docling pipeline preloaded successfully with profile=%s, force_backend_text=%s, do_ocr=%s, do_table_structure=%s.",
                settings.vlearn_docling_model,
                settings.vlearn_docling_force_backend_text,
                settings.vlearn_docling_do_ocr,
                settings.vlearn_docling_do_table_structure,
            )
        except Exception:
            logger.exception("Failed to preload Docling converter.")

        try:
            await self._rag_service.warmup()
        except Exception:
            logger.exception("Failed to preload embedding model.")

    async def shutdown(self) -> None:
        await self._llm_service.shutdown()
        await self._guardrail_service.shutdown()

    async def get_material(self, material_id: str) -> MaterialResponse:
        return MaterialResponse(
            id=material_id,
            title="AI Reading Assistant",
            courseCode="VLEARN",
            pageNumber=1,
            pageCount=1,
            sourceIds=[],
        )

    async def chat(self, payload: ChatRequest) -> ChatResponse:
        conversation_id = payload.conversation_id or str(uuid4())
        route = await self._guardrail_service.route_intent(payload)
        use_rag = route.route == "agent"
        processed_context = await self._collect_processed_context(payload, include_rag=use_rag)
        prompt = self._build_chat_prompt(payload, processed_context)
        response_text = await self._generate_by_route(route, payload, prompt)
        output_check = await self._guardrail_service.check_output(response_text, payload)
        response_text = output_check.response

        quiz = None
        mindmap_image = None
        quiz_offer = False
        if self._should_generate_quiz(payload):
            quiz = self._generate_quiz_artifact(payload, processed_context, response_text)
        elif self._should_generate_mindmap_image(payload):
            mindmap_image = self._generate_mindmap_image_artifact(
                payload,
                processed_context,
                response_text,
            )
        elif await self._should_offer_quiz(payload, processed_context, response_text):
            quiz_offer = True

        return ChatResponse(
            response=response_text,
            conversation_id=conversation_id,
            sources=self._build_sources(payload),
            quiz=quiz,
            mindmap_image=mindmap_image,
            quiz_offer=quiz_offer,
            trace=[
                self._trace("node_end", "input_guardrail", self._route_trace_payload(route)),
                self._trace(
                    "node_end",
                    "output_guardrail",
                    self._output_guardrail_trace_payload(output_check),
                ),
            ],
            timestamp=datetime.now(UTC),
        )

    async def stream_chat(self, payload: ChatRequest) -> AsyncIterator[str]:
        conversation_id = payload.conversation_id or str(uuid4())
        emitted_trace: list[TraceEvent] = []

        async def emit(event: TraceEvent) -> str:
            emitted_trace.append(event)
            return self._encode_sse("trace", event.model_dump())

        page_number = payload.page_number or 1
        yield await emit(
            self._trace(
                "node_start",
                "input_guardrail",
                {
                    "model": settings.vlearn_input_guardrail_model,
                    "question": payload.message,
                    "page_number": page_number,
                },
            )
        )
        route = await self._guardrail_service.route_intent(payload)
        yield await emit(
            self._trace("node_end", "input_guardrail", self._route_trace_payload(route))
        )

        yield await emit(
            self._trace(
                "node_start",
                "router_planner",
                {
                    "question": payload.message,
                    "page_number": page_number,
                    "history_turn_count": len(payload.history),
                    "selected_text_count": sum(context.type == "text" for context in payload.contexts),
                    "image_count": sum(attachment.kind == "image" for attachment in payload.attachments),
                    "file_count": sum(
                        attachment.purpose == "attachment" and attachment.kind != "image"
                        for attachment in payload.attachments
                    ),
                },
            )
        )
        yield await emit(
            self._trace(
                "node_end",
                "router_planner",
                {
                    "route": route.route,
                    "reason": route.reason,
                    "execution": "learning_agent" if route.route == "agent" else "grounded_chat",
                },
            )
        )

        use_rag = route.route == "agent"
        processed_context = await self._collect_processed_context(
            payload,
            emit=emit,
            include_rag=use_rag,
        )
        prompt = self._build_chat_prompt(payload, processed_context)

        yield await emit(
            self._trace(
                "node_start",
                "llm_generation",
                {
                    "model": settings.vlearn_agent_model,
                    "context_blocks": len(processed_context),
                    "route": route.route,
                },
            )
        )
        response_text = await self._generate_by_route(route, payload, prompt)
        yield await emit(
            self._trace(
                "node_end",
                "llm_generation",
                {"characters": len(response_text), "preview": response_text[:300]},
            )
        )

        yield await emit(
            self._trace(
                "node_start",
                "output_guardrail",
                {"model": settings.vlearn_output_guardrail_model, "characters": len(response_text)},
            )
        )
        output_check = await self._guardrail_service.check_output(response_text, payload)
        response_text = output_check.response
        yield await emit(
            self._trace(
                "node_end",
                "output_guardrail",
                self._output_guardrail_trace_payload(output_check),
            )
        )

        quiz = None
        mindmap_image = None
        quiz_offer = False
        if self._should_generate_quiz(payload):
            yield await emit(
                self._trace(
                    "tool_call",
                    "gen_question",
                    {"tool": "gen_question", "context_blocks": len(processed_context)},
                )
            )
            quiz = self._generate_quiz_artifact(payload, processed_context, response_text)
            yield await emit(
                self._trace(
                    "tool_result",
                    "gen_question",
                    {
                        "has_quiz": quiz is not None,
                        "question": quiz.question if quiz else None,
                        "choice_count": len(quiz.choices) if quiz else 0,
                    },
                )
            )
        elif self._should_generate_mindmap_image(payload):
            outline_context = self._build_mindmap_context(payload, processed_context, response_text)
            yield await emit(
                self._trace(
                    "tool_call",
                    "gen_mindmap",
                    {"tool": "gen_mindmap", "context_characters": len(outline_context)},
                )
            )
            outline_json = self._generate_mindmap_outline(outline_context)
            yield await emit(
                self._trace(
                    "tool_result",
                    "gen_mindmap",
                    {
                        "has_outline": bool(outline_json),
                        "characters": len(outline_json or ""),
                        "preview": (outline_json or "")[:300],
                    },
                )
            )
            yield await emit(
                self._trace(
                    "tool_call",
                    "gen_mindmap_image",
                    {"tool": "gen_mindmap_image", "response_characters": len(response_text)},
                )
            )
            mindmap_image = self._generate_mindmap_image_artifact(
                payload,
                processed_context,
                response_text,
                outline_json=outline_json,
            )
            yield await emit(
                self._trace(
                    "tool_result",
                    "gen_mindmap_image",
                    {
                        "has_image": mindmap_image is not None and bool(mindmap_image.image_data_url),
                        "model": mindmap_image.model if mindmap_image else None,
                        "mime_type": mindmap_image.mime_type if mindmap_image else None,
                        "note": mindmap_image.note if mindmap_image else "Mindmap image generation failed.",
                    },
                )
            )
            if mindmap_image is not None:
                yield self._encode_sse(
                    "artifact",
                    {
                        "type": "mindmap_image",
                        "mindmap_image": mindmap_image.model_dump(mode="json"),
                    },
                )
        elif await self._should_offer_quiz(payload, processed_context, response_text):
            quiz_offer = True

        for chunk in self._chunk_text(response_text, chunk_size=80):
            yield self._encode_sse("message_delta", {"delta": chunk})

        final_response = ChatResponse(
            response=response_text,
            conversation_id=conversation_id,
            sources=self._build_sources(payload),
            quiz=quiz,
            mindmap_image=mindmap_image,
            quiz_offer=quiz_offer,
            trace=emitted_trace,
            timestamp=datetime.now(UTC),
        )
        yield self._encode_sse("final", final_response.model_dump(mode="json"))

    async def _collect_processed_context(
        self,
        payload: ChatRequest,
        emit: Callable[[TraceEvent], object] | None = None,
        include_rag: bool = True,
    ) -> list[str]:
        processed_context: list[str] = []
        page_number = payload.page_number or 1

        current_documents = [item for item in payload.attachments if item.purpose == "current_document"]
        for document in current_documents:
            if emit:
                await emit(
                    self._trace(
                        "tool_call",
                        "parse_current_slide",
                        {"tool": "docling", "file_name": document.name, "page_number": page_number},
                    )
                )
            parsed = await self._document_service.parse_attachment(document, page_number)
            processed_context.append(f"Noi dung slide trang {page_number} tu {document.name}:\n{parsed}")
            if emit:
                await emit(
                    self._trace(
                        "tool_result",
                        "parse_current_slide",
                        {"page_number": page_number, "characters": len(parsed), "preview": parsed[:500]},
                    )
                )

        for attachment in payload.attachments:
            if attachment.purpose != "attachment":
                continue
            if attachment.kind == "image":
                if emit:
                    await emit(
                        self._trace(
                            "tool_call",
                            "understand_image",
                            {"tool": "mock_image_reader", "file_name": attachment.name},
                        )
                    )
                image_context = self._document_service.describe_image(attachment)
                processed_context.append(image_context)
                if emit:
                    await emit(
                        self._trace(
                            "tool_result",
                            "understand_image",
                            {"file_name": attachment.name, "result": image_context},
                        )
                    )
                continue

            if emit:
                await emit(
                    self._trace(
                        "tool_call",
                        "parse_attached_document",
                        {"tool": "docling", "file_name": attachment.name},
                    )
                )
            parsed = await self._document_service.parse_attachment(attachment)
            processed_context.append(f"Tai lieu dinh kem {attachment.name}:\n{parsed}")
            if emit:
                await emit(
                    self._trace(
                        "tool_result",
                        "parse_attached_document",
                        {"file_name": attachment.name, "characters": len(parsed), "preview": parsed[:500]},
                    )
                )

        selected_context = self._describe_contexts(payload.contexts)
        if selected_context:
            processed_context.append(selected_context)
            if emit:
                await emit(self._trace("node_start", "selected_pdf_context", {"context_count": len(payload.contexts)}))
                await emit(self._trace("node_end", "selected_pdf_context", {"preview": selected_context[:500]}))

        if include_rag and payload.message:
            if emit:
                await emit(
                    self._trace(
                        "tool_call",
                        "rag_retrieval",
                        {
                            "query": payload.message,
                            "retrieval_mode": "hybrid_rag",
                            "ranking": "0.7 * cosine + 0.3 * bm25_like",
                            "top_k": settings.vlearn_rag_top_k,
                            "score_threshold": settings.vlearn_rag_score_threshold,
                        },
                    )
                )
            rag_results = await self._rag_service.retrieve(payload.message)
            processed_context.extend(self._rag_service.format_context_blocks(rag_results))
            if emit:
                await emit(
                    self._trace(
                        "tool_result",
                        "rag_retrieval",
                        {
                            "accepted_count": len(rag_results),
                            "results": [
                                {
                                    "source_type": item["source_type"],
                                    "source_id": item["source_id"],
                                    "combined_score": round(float(item["combined_score"]), 4),
                                    "cosine_score": round(float(item["cosine_score"]), 4),
                                    "bm25_score": round(float(item["bm25_score"]), 4),
                                    "retrieval_methods": item["retrieval_methods"],
                                    "preview": str(item["content"])[:280],
                                    "extra_content": str(item["extra_content"])[:160],
                                }
                                for item in rag_results
                            ],
                        },
                    )
                )
        elif emit and payload.message:
            await emit(
                self._trace(
                    "node_end",
                    "rag_retrieval",
                    {
                        "skipped": True,
                        "reason": "Route is grounded_chat, so retrieval DB was not used.",
                    },
                )
            )

        return processed_context

    async def _generate_text(self, prompt: str) -> str:
        return await self._llm_service.generate(
            system_prompt=SYSTEM_PROMPT,
            user_prompt=prompt,
            fallback=self._fallback_response(prompt),
        )

    async def _generate_by_route(
        self,
        route: GuardrailRouteResult,
        payload: ChatRequest,
        prompt: str,
    ) -> str:
        if route.route == "agent":
            return await self._generate_agent_text(payload, prompt)
        return await self._generate_text(prompt)

    async def _generate_agent_text(self, payload: ChatRequest, prompt: str) -> str:
        if not settings.openai_api_key:
            return await self._generate_text(prompt)

        try:
            agent = build_learning_agent(settings.vlearn_agent_model)
            result = await agent.ainvoke(
                {
                    "messages": [
                        {
                            "role": "user",
                            "content": (
                                "Use the available learning tools only when needed. "
                                "Return the final answer in Vietnamese.\n\n"
                                f"{prompt}"
                            ),
                        }
                    ],
                    "page_number": payload.page_number,
                    "source_ids": payload.source_ids,
                }
            )
            extracted = self._extract_agent_response(result)
            if extracted:
                return extracted
        except Exception:
            logger.exception("Learning agent execution failed; falling back to grounded chat")
        return await self._generate_text(prompt)

    def _extract_agent_response(self, result: object) -> str | None:
        if isinstance(result, str):
            return result.strip() or None
        if not isinstance(result, dict):
            return None

        output = result.get("output")
        if isinstance(output, str) and output.strip():
            return output.strip()

        messages = result.get("messages")
        if isinstance(messages, list) and messages:
            last = messages[-1]
            content = getattr(last, "content", None)
            if isinstance(last, dict):
                content = last.get("content")
            if isinstance(content, str) and content.strip():
                return content.strip()
            if isinstance(content, list):
                text_parts = [
                    part.get("text", "")
                    for part in content
                    if isinstance(part, dict) and isinstance(part.get("text"), str)
                ]
                text = "\n".join(part for part in text_parts if part.strip()).strip()
                return text or None
        return None

    def _fallback_response(self, prompt: str) -> str:
        return (
            "Minh da nhan cau hoi va tong hop cac nguon ngu canh hien co. "
            "Backend chua co `OPENAI_API_KEY`, nen day la phan hoi du phong thay vi cau tra loi tu Agent Model.\n\n"
            f"Ngu canh da xu ly:\n{prompt[:1200]}"
        )

    def _build_chat_prompt(self, payload: ChatRequest, processed_context: list[str]) -> str:
        page_number = payload.page_number or 1
        context = "\n\n---\n\n".join(processed_context) or "Khong co noi dung trich xuat."
        history = self._describe_history(payload.history)
        return (
            f"Trang slide hien tai: {page_number}\n"
            f"Doan duoc boi den: {payload.selected_text or 'Khong co'}\n\n"
            f"LICH SU HOI THOAI GAN DAY:\n{history}\n\n"
            f"NGU CANH DA XU LY:\n{context}\n\n"
            f"CAU HOI: {payload.message or 'Hay giai thich noi dung vua duoc cung cap.'}"
        )

    def _describe_history(self, history: list[ChatHistoryItem]) -> str:
        if not history:
            return "Chua co lich su hoi thoai truoc do."
        return "\n".join(f"{item.role.upper()}: {item.content}" for item in history[-12:])

    def _describe_contexts(self, contexts: list[ChatContext]) -> str:
        parts: list[str] = []
        for context in contexts:
            if context.type == "text" and context.text:
                parts.append(f"Doan duoc chon o trang {context.page_number}: {context.text}")
            elif context.type == "image":
                parts.append(
                    f"Vung anh duoc chon o trang {context.page_number}: "
                    "noi dung anh dang dung mo phong, chua chay OCR/VLM that."
                )
        return "\n".join(parts)

    def _build_sources(self, payload: ChatRequest) -> list[str]:
        if payload.source_ids:
            return payload.source_ids[:4]
        pages = {payload.page_number} if payload.page_number else set()
        pages.update(context.page_number for context in payload.contexts)
        return [f"slide-{page}" for page in sorted(pages)]

    def _should_generate_quiz(self, payload: ChatRequest) -> bool:
        if payload.quiz_request == "accept":
            return True
        if payload.quiz_request == "decline":
            return False
        return self._is_explicit_quiz_request(payload.message)

    async def _should_offer_quiz(
        self,
        payload: ChatRequest,
        processed_context: list[str],
        response_text: str,
    ) -> bool:
        if payload.quiz_request != "none":
            return False
        if self._is_explicit_quiz_request(payload.message):
            return False
        return await self._decide_quiz_offer(payload, processed_context, response_text)

    def _is_explicit_quiz_request(self, message: str) -> bool:
        normalized = message.lower()
        quiz_keywords = (
            "tao cau hoi",
            "tạo câu hỏi",
            "tao quiz",
            "tạo quiz",
            "cau hoi trac nghiem",
            "câu hỏi trắc nghiệm",
            "kiem tra nhanh",
            "kiểm tra nhanh",
            "ra de",
            "ra đề",
        )
        return any(keyword in normalized for keyword in quiz_keywords)

    def _should_generate_mindmap_image(self, payload: ChatRequest) -> bool:
        if self._should_generate_quiz(payload):
            return False
        normalized = payload.message.lower()
        keywords = (
            "mindmap",
            "mind map",
            "so do tu duy",
            "sơ đồ tư duy",
            "ve mindmap",
            "vẽ mindmap",
            "tao anh mindmap",
            "tạo ảnh mindmap",
            "anh mindmap",
            "ảnh mindmap",
            "xuat anh",
            "xuất ảnh",
        )
        return any(keyword in normalized for keyword in keywords)

    async def _decide_quiz_offer(
        self,
        payload: ChatRequest,
        processed_context: list[str],
        response_text: str,
    ) -> bool:
        fallback = '{"offer_quiz": false, "reason": "Conservative fallback."}'
        raw = await self._llm_service.generate(
            system_prompt=(
                "You decide whether a Vietnamese learning assistant should ask the learner "
                "if they want one follow-up quiz question. Return JSON only with "
                '{"offer_quiz": true|false, "reason": "..."}.\n'
                "Use the recent conversation, the learner message, the assistant reply, and "
                "the study context. Offer a quiz only when it is pedagogically useful to check "
                "understanding. Do not offer on every turn. Do not offer after routine admin "
                "messages or when the learner already asked to skip."
            ),
            user_prompt=self._build_quiz_offer_prompt(payload, processed_context, response_text),
            fallback=fallback,
            model=settings.vlearn_head_model,
            json_output=True,
        )
        try:
            decision = json.loads(raw)
            return bool(decision.get("offer_quiz") is True)
        except Exception:
            logger.exception("Failed to parse quiz offer decision")
            return False

    def _build_quiz_offer_prompt(
        self,
        payload: ChatRequest,
        processed_context: list[str],
        response_text: str,
    ) -> str:
        history_preview = self._describe_history(payload.history)
        context_preview = "\n\n".join(processed_context[-3:])[:2500] or "No processed context."
        return (
            f"Latest learner message:\n{payload.message or '(empty)'}\n\n"
            f"Recent conversation history:\n{history_preview}\n\n"
            f"Assistant response just generated:\n{response_text[:2500]}\n\n"
            f"Processed learning context preview:\n{context_preview}\n\n"
            "Should the assistant now ask whether the learner wants one quick follow-up quiz question?"
        )

    def _generate_quiz_artifact(
        self,
        payload: ChatRequest,
        processed_context: list[str],
        response_text: str,
    ) -> QuizArtifact | None:
        context = "\n\n".join(processed_context[-4:])
        quiz_context = (
            f"Cau hoi nguoi dung: {payload.message}\n\n"
            f"Tom tat tra loi cua tro giang:\n{response_text}\n\n"
            f"Ngu canh nen:\n{context}"
        ).strip()
        try:
            raw = gen_question.invoke({"context": quiz_context})
            payload_json = json.loads(raw)
            choices = payload_json.get("choices")
            correct_index = payload_json.get("correctIndex")
            if (
                not isinstance(payload_json.get("question"), str)
                or not isinstance(choices, list)
                or len(choices) != 4
                or any(not isinstance(choice, str) or not choice.strip() for choice in choices)
                or not isinstance(correct_index, int)
                or correct_index < 0
                or correct_index > 3
                or not isinstance(payload_json.get("explanation"), str)
            ):
                return None
            return QuizArtifact(
                question=payload_json["question"].strip(),
                choices=[choice.strip() for choice in choices],
                correctIndex=correct_index,
                explanation=payload_json["explanation"].strip(),
                citations=self._build_sources(payload),
            )
        except Exception:
            logger.exception("Failed to generate quiz artifact")
            return None

    def _build_mindmap_context(
        self,
        payload: ChatRequest,
        processed_context: list[str],
        response_text: str,
    ) -> str:
        context_preview = "\n\n".join(processed_context[-4:]).strip()
        return (
            f"Yeu cau nguoi dung:\n{payload.message or 'Tao anh mindmap'}\n\n"
            f"Noi dung tro giang vua tong hop:\n{response_text.strip()}\n\n"
            f"Ngu canh hoc tap lien quan:\n{context_preview or 'Khong co ngu canh bo sung.'}"
        ).strip()

    def _generate_mindmap_image_artifact(
        self,
        payload: ChatRequest,
        processed_context: list[str],
        response_text: str,
        outline_json: str | None = None,
    ) -> MindmapImageArtifact | None:
        outline_context = self._build_mindmap_context(payload, processed_context, response_text)
        try:
            outline_json = outline_json or self._generate_mindmap_outline(outline_context)
            raw = gen_mindmap_image.invoke(
                {
                    "content": response_text.strip() or payload.message.strip() or outline_context,
                    "outline_json": outline_json,
                }
            )
            payload_json = json.loads(raw)
            if not isinstance(payload_json, dict):
                return None
            return MindmapImageArtifact(
                model=str(payload_json.get("model") or settings.vlearn_mindmap_image_model),
                image_data_url=payload_json.get("image_data_url"),
                mime_type=str(payload_json.get("mime_type") or "image/png"),
                note=str(payload_json.get("note") or ""),
            )
        except Exception:
            logger.exception("Failed to generate mindmap image artifact")
            return None

    def _generate_mindmap_outline(self, context: str) -> str | None:
        try:
            return gen_mindmap.invoke({"context": context})
        except Exception:
            logger.exception("Failed to generate mindmap outline")
            return None

    def _trace(self, event_type: str, node_name: str, payload: dict[str, object]) -> TraceEvent:
        return TraceEvent(type=event_type, node_name=node_name, payload=payload)

    def _route_trace_payload(self, route: GuardrailRouteResult) -> dict[str, object]:
        return {
            "route": route.route,
            "reason": route.reason,
            "model": route.model,
            "fallback": route.fallback,
        }

    def _output_guardrail_trace_payload(self, result: GuardrailOutputResult) -> dict[str, object]:
        return {
            "allowed": result.allowed,
            "reason": result.reason,
            "model": result.model,
            "fallback": result.fallback,
            "characters": len(result.response),
        }

    def _chunk_text(self, text: str, chunk_size: int) -> list[str]:
        return [text[index : index + chunk_size] for index in range(0, len(text), chunk_size)] or [""]

    def _encode_sse(self, event_name: str, payload: dict[str, object]) -> str:
        return f"event: {event_name}\ndata: {json.dumps(payload, ensure_ascii=False)}\n\n"
