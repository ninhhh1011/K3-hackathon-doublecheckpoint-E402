import asyncio
import base64
import json
import tempfile
from collections.abc import AsyncIterator
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from uuid import uuid4

from openai import AsyncOpenAI

from src.core.config import settings
from src.core.logging import logger
from src.models.schemas import (
    ChatHistoryItem,
    ChatContext,
    ChatRequest,
    ChatResponse,
    MaterialResponse,
    TraceEvent,
    TutorAttachment,
)

SYSTEM_PROMPT = """
Ban la VLearn Tutor, tro giang AI than thien cho sinh vien dai hoc.
Chi tra loi dua tren ngu canh duoc cung cap tu slide hien tai, doan van ban duoc chon,
anh va tai lieu dinh kem. Luon nhac so trang slide khi dung noi dung tu slide.
Neu du lieu khong du, noi ro gioi han thay vi bia. Tra loi bang tieng Viet co dau,
ro rang, uu tien giai thich de hieu va co cau truc ngan gon.
""".strip()


class AgentService:
    """Service cho API chat duy nhat, phat trace SSE tu cac buoc xu ly that."""

    def __init__(self) -> None:
        self._client = AsyncOpenAI(api_key=settings.openai_api_key) if settings.openai_api_key else None
        self._docling_converter: Any | None = None
        self._docling_init_lock = asyncio.Lock()
        self._docling_convert_lock = asyncio.Lock()

    async def warmup(self) -> None:
        """Preload cac dependency nang ngay luc app khoi dong."""
        if self._client:
            logger.info("OpenAI client initialized for model %s", settings.vlearn_agent_model)
        else:
            logger.warning("OPENAI_API_KEY is missing, skipping remote model warmup.")

        try:
            converter = await self._ensure_docling_converter()
            await asyncio.to_thread(converter.initialize_pipeline, self._docling_input_format())
            logger.info(
                "Docling pipeline preloaded successfully with profile=%s, force_backend_text=%s, do_ocr=%s, do_table_structure=%s.",
                settings.vlearn_docling_model,
                settings.vlearn_docling_force_backend_text,
                settings.vlearn_docling_do_ocr,
                settings.vlearn_docling_do_table_structure,
            )
        except Exception:  # noqa: BLE001 - warmup must not crash app startup
            logger.exception("Failed to preload Docling converter.")

    async def shutdown(self) -> None:
        if self._client:
            await self._client.close()

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
        processed_context, _ = await self._process_inputs(payload)
        response_text = await self._generate_text(self._build_chat_prompt(payload, processed_context))
        return ChatResponse(
            response=response_text,
            conversation_id=conversation_id,
            sources=self._build_sources(payload),
            trace=[],
            timestamp=datetime.now(UTC),
        )

    async def stream_chat(self, payload: ChatRequest) -> AsyncIterator[str]:
        conversation_id = payload.conversation_id or str(uuid4())
        emitted_trace: list[TraceEvent] = []

        async def emit(event: TraceEvent) -> str:
            emitted_trace.append(event)
            return self._encode_sse("trace", event.model_dump())

        page_number = payload.page_number or 1
        router_input = {
            "question": payload.message,
            "page_number": page_number,
            "history_turn_count": len(payload.history),
            "selected_text_count": sum(context.type == "text" for context in payload.contexts),
            "image_count": sum(attachment.kind == "image" for attachment in payload.attachments),
            "file_count": sum(
                attachment.purpose == "attachment" and attachment.kind != "image"
                for attachment in payload.attachments
            ),
        }
        yield await emit(self._trace("node_start", "router_planner", router_input))
        yield await emit(
            self._trace(
                "node_end",
                "router_planner",
                {"route": "agent_with_tools", "reason": "Luon doc slide hien tai truoc khi tra loi."},
            )
        )

        processed_context: list[str] = []
        current_documents = [
            item for item in payload.attachments if item.purpose == "current_document"
        ]
        for document in current_documents:
            yield await emit(
                self._trace(
                    "tool_call",
                    "parse_current_slide",
                    {"tool": "docling", "file_name": document.name, "page_number": page_number},
                )
            )
            try:
                parsed = await self._parse_document_with_docling(document, page_number)
                processed_context.append(
                    f"Noi dung slide trang {page_number} tu {document.name}:\n{parsed}"
                )
                yield await emit(
                    self._trace(
                        "tool_result",
                        "parse_current_slide",
                        {"page_number": page_number, "characters": len(parsed), "preview": parsed[:500]},
                    )
                )
            except Exception as exc:  # noqa: BLE001 - stream the tool failure to the trace
                logger.exception("Docling failed to parse the current slide")
                yield await emit(
                    self._trace(
                        "node_end",
                        "parse_current_slide",
                        {"status": "error", "error": str(exc)},
                    )
                )

        for attachment in payload.attachments:
            if attachment.purpose != "attachment":
                continue
            if attachment.kind == "image":
                yield await emit(
                    self._trace(
                        "tool_call",
                        "understand_image",
                        {"tool": "mock_image_reader", "file_name": attachment.name},
                    )
                )
                image_context = self._mock_image_understanding(attachment)
                processed_context.append(image_context)
                yield await emit(
                    self._trace(
                        "tool_result",
                        "understand_image",
                        {"file_name": attachment.name, "result": image_context},
                    )
                )
                continue

            yield await emit(
                self._trace(
                    "tool_call",
                    "parse_attached_document",
                    {"tool": "docling", "file_name": attachment.name},
                )
            )
            try:
                parsed = await self._parse_document_with_docling(attachment)
                processed_context.append(f"Tai lieu dinh kem {attachment.name}:\n{parsed}")
                yield await emit(
                    self._trace(
                        "tool_result",
                        "parse_attached_document",
                        {"file_name": attachment.name, "characters": len(parsed), "preview": parsed[:500]},
                    )
                )
            except Exception as exc:  # noqa: BLE001 - stream the tool failure to the trace
                logger.exception("Docling failed to parse attachment %s", attachment.name)
                yield await emit(
                    self._trace(
                        "node_end",
                        "parse_attached_document",
                        {"status": "error", "file_name": attachment.name, "error": str(exc)},
                    )
                )

        selected_context = self._describe_contexts(payload.contexts)
        if selected_context:
            processed_context.append(selected_context)
            yield await emit(
                self._trace(
                    "node_start",
                    "selected_pdf_context",
                    {"context_count": len(payload.contexts)},
                )
            )
            yield await emit(
                self._trace(
                    "node_end",
                    "selected_pdf_context",
                    {"preview": selected_context[:500]},
                )
            )

        prompt = self._build_chat_prompt(payload, processed_context)
        yield await emit(
            self._trace(
                "node_start",
                "llm_generation",
                {"model": settings.vlearn_agent_model, "context_blocks": len(processed_context)},
            )
        )
        response_text = await self._generate_text(prompt)
        yield await emit(
            self._trace(
                "node_end",
                "llm_generation",
                {"characters": len(response_text), "preview": response_text[:300]},
            )
        )

        for chunk in self._chunk_text(response_text, chunk_size=80):
            yield self._encode_sse("message_delta", {"delta": chunk})

        final_response = ChatResponse(
            response=response_text,
            conversation_id=conversation_id,
            sources=self._build_sources(payload),
            trace=emitted_trace,
            timestamp=datetime.now(UTC),
        )
        yield self._encode_sse("final", final_response.model_dump(mode="json"))

    async def _process_inputs(self, payload: ChatRequest) -> tuple[list[str], list[TraceEvent]]:
        blocks: list[str] = []
        for attachment in payload.attachments:
            if attachment.kind == "image":
                blocks.append(self._mock_image_understanding(attachment))
            else:
                page = payload.page_number if attachment.purpose == "current_document" else None
                blocks.append(await self._parse_document_with_docling(attachment, page))
        selected = self._describe_contexts(payload.contexts)
        if selected:
            blocks.append(selected)
        return blocks, []

    async def _ensure_docling_converter(self) -> Any:
        if self._docling_converter is not None:
            return self._docling_converter

        async with self._docling_init_lock:
            if self._docling_converter is not None:
                return self._docling_converter

            def build_converter() -> Any:
                from docling.datamodel.base_models import InputFormat
                from docling.datamodel.pipeline_options import PdfPipelineOptions
                from docling.document_converter import DocumentConverter, PdfFormatOption

                pdf_pipeline_options = PdfPipelineOptions(
                    do_ocr=settings.vlearn_docling_do_ocr,
                    do_table_structure=settings.vlearn_docling_do_table_structure,
                    do_code_enrichment=False,
                    do_formula_enrichment=False,
                    force_backend_text=settings.vlearn_docling_force_backend_text,
                )
                pdf_pipeline_options.generate_page_images = False
                pdf_pipeline_options.generate_picture_images = False
                pdf_pipeline_options.generate_table_images = False
                pdf_pipeline_options.do_picture_classification = False
                pdf_pipeline_options.do_picture_description = False
                pdf_pipeline_options.do_chart_extraction = False

                return DocumentConverter(
                    allowed_formats=[InputFormat.PDF],
                    format_options={
                        InputFormat.PDF: PdfFormatOption(
                            pipeline_options=pdf_pipeline_options,
                        ),
                    },
                )

            self._docling_converter = await asyncio.to_thread(build_converter)
            return self._docling_converter

    def _docling_input_format(self) -> Any:
        from docling.datamodel.base_models import InputFormat

        return InputFormat.PDF

    async def _parse_document_with_docling(
        self,
        attachment: TutorAttachment,
        page_number: int | None = None,
    ) -> str:
        if attachment.text_content:
            return attachment.text_content
        if not attachment.file_data_url:
            raise ValueError("Tai lieu khong co du lieu de Docling xu ly.")

        converter = await self._ensure_docling_converter()
        raw = self._decode_data_url(attachment.file_data_url)
        suffix = Path(attachment.name).suffix or ".bin"

        fallback_text = self._extract_text_attachment_fallback(attachment, raw)
        if fallback_text:
            return fallback_text

        def convert() -> str:
            temp_path: Path | None = None
            try:
                with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as temp_file:
                    temp_file.write(raw)
                    temp_path = Path(temp_file.name)
                result = converter.convert(str(temp_path))
                if page_number is not None:
                    try:
                        markdown = result.document.export_to_markdown(page_no=page_number)
                    except TypeError:
                        markdown = result.document.export_to_markdown()
                else:
                    markdown = result.document.export_to_markdown()
                cleaned = markdown.strip()
                if not cleaned:
                    return self._build_empty_docling_result_message(attachment, page_number)
                return cleaned[:30_000]
            finally:
                if temp_path is not None:
                    temp_path.unlink(missing_ok=True)

        async with self._docling_convert_lock:
            try:
                return await asyncio.to_thread(convert)
            except Exception:
                logger.exception("Docling conversion failed for attachment %s", attachment.name)
                return self._build_empty_docling_result_message(attachment, page_number)

    def _mock_image_understanding(self, attachment: TutorAttachment) -> str:
        return (
            f"Anh dinh kem {attachment.name}: day la noi dung mo phong tu image reader. "
            "Anh co the chua so do, cong thuc hoac noi dung hoc tap; chua chay OCR/VLM that."
        )

    def _extract_text_attachment_fallback(
        self,
        attachment: TutorAttachment,
        raw: bytes,
    ) -> str | None:
        mime_type = (attachment.mime_type or "").lower()
        if attachment.kind != "text" and not mime_type.startswith("text/"):
            return None

        for encoding in ("utf-8", "utf-8-sig", "latin-1"):
            try:
                decoded = raw.decode(encoding).strip()
            except UnicodeDecodeError:
                continue
            if decoded:
                return decoded[:30_000]
        return None

    def _build_empty_docling_result_message(
        self,
        attachment: TutorAttachment,
        page_number: int | None,
    ) -> str:
        page_hint = f" o trang {page_number}" if page_number is not None else ""
        if attachment.kind == "pdf" and not settings.vlearn_docling_do_ocr:
            return (
                f"Docling khong trich xuat duoc noi dung tu tep {attachment.name}{page_hint}. "
                "Tep nay co the la PDF scan hoac chi gom hinh anh, trong khi cau hinh hien tai dang tat OCR de uu tien toc do."
            )
        return (
            f"Docling khong trich xuat duoc noi dung tu tep {attachment.name}{page_hint}. "
            "Co the tep khong co text layer hop le hoac dinh dang khong phu hop voi bo doc hien tai."
        )

    async def _generate_text(self, prompt: str) -> str:
        if not self._client:
            logger.warning("OPENAI_API_KEY is missing, using grounded fallback response.")
            return self._fallback_response(prompt)
        try:
            response = await self._client.chat.completions.create(
                model=settings.vlearn_agent_model,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": prompt},
                ],
            )
            content = response.choices[0].message.content
            if isinstance(content, str) and content.strip():
                return content.strip()
        except Exception:  # noqa: BLE001 - model provider errors must fall back gracefully
            logger.exception("Failed to generate the tutor response")
        return self._fallback_response(prompt)

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
        lines = [f"{item.role.upper()}: {item.content}" for item in history[-12:]]
        return "\n".join(lines)

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

    def _trace(self, event_type: str, node_name: str, payload: dict[str, object]) -> TraceEvent:
        return TraceEvent(type=event_type, node_name=node_name, payload=payload)

    def _decode_data_url(self, value: str) -> bytes:
        try:
            _, encoded = value.split(",", 1)
            return base64.b64decode(encoded, validate=True)
        except (ValueError, base64.binascii.Error) as exc:
            raise ValueError("file_data_url khong phai data URL base64 hop le.") from exc

    def _chunk_text(self, text: str, chunk_size: int) -> list[str]:
        return [text[index : index + chunk_size] for index in range(0, len(text), chunk_size)] or [""]

    def _encode_sse(self, event_name: str, payload: dict[str, object]) -> str:
        return f"event: {event_name}\ndata: {json.dumps(payload, ensure_ascii=False)}\n\n"
