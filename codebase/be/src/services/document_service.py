import asyncio
import base64
import hashlib
import tempfile
from pathlib import Path
from typing import Any

from src.core.config import settings
from src.core.logging import logger
from src.models.schemas import TutorAttachment


class DocumentService:
    def __init__(self) -> None:
        self._docling_converter: Any | None = None
        self._docling_init_lock = asyncio.Lock()
        self._docling_convert_lock = asyncio.Lock()
        self._parse_cache: dict[str, str] = {}
        self._parse_cache_lock = asyncio.Lock()

    async def warmup(self) -> None:
        converter = await self._ensure_docling_converter()
        await asyncio.to_thread(converter.initialize_pipeline, self._docling_input_format())

    async def parse_attachment(
        self,
        attachment: TutorAttachment,
        page_number: int | None = None,
    ) -> str:
        text, _ = await self.parse_attachment_with_cache_status(attachment, page_number)
        return text

    async def parse_attachment_with_cache_status(
        self,
        attachment: TutorAttachment,
        page_number: int | None = None,
    ) -> tuple[str, bool]:
        cache_key = self._build_parse_cache_key(attachment, page_number)
        async with self._parse_cache_lock:
            cached = self._parse_cache.get(cache_key)
        if cached is not None:
            return cached, True

        parsed = await self._parse_attachment_uncached(attachment, page_number)
        async with self._parse_cache_lock:
            self._parse_cache[cache_key] = parsed
        return parsed, False

    async def _parse_attachment_uncached(
        self,
        attachment: TutorAttachment,
        page_number: int | None = None,
    ) -> str:
        if attachment.text_content:
            return attachment.text_content
        if not attachment.file_data_url:
            raise ValueError("Tài liệu không có dữ liệu để Docling xử lý.")

        raw = self._decode_data_url(attachment.file_data_url)
        suffix = Path(attachment.name).suffix or ".bin"

        fallback_text = self._extract_text_attachment_fallback(attachment, raw)
        if fallback_text:
            return fallback_text

        try:
            converter = await self._ensure_docling_converter()
        except Exception:
            logger.exception("Docling is unavailable for attachment %s", attachment.name)
            return self._build_empty_docling_result_message(attachment, page_number)

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

    def _build_parse_cache_key(
        self,
        attachment: TutorAttachment,
        page_number: int | None,
    ) -> str:
        content = attachment.file_data_url or attachment.text_content or ""
        digest = hashlib.sha256(content.encode("utf-8", errors="ignore")).hexdigest()
        return "|".join(
            [
                attachment.name,
                attachment.kind,
                attachment.mime_type or "",
                str(page_number or "all"),
                digest,
            ]
        )

    def describe_image(self, attachment: TutorAttachment) -> str:
        return (
            f"Ảnh đính kèm {attachment.name}: đây là nội dung mô phỏng từ image reader. "
            "Ảnh có thể chứa sơ đồ, công thức hoặc nội dung học tập; hiện chưa chạy OCR/VLM thật."
        )

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
        page_hint = f" ở trang {page_number}" if page_number is not None else ""
        if attachment.kind == "pdf" and not settings.vlearn_docling_do_ocr:
            return (
                f"Docling không trích xuất được nội dung từ tệp {attachment.name}{page_hint}. "
                "Tệp này có thể là PDF scan hoặc chỉ gồm hình ảnh, trong khi cấu hình hiện tại đang tắt OCR để ưu tiên tốc độ."
            )
        return (
            f"Docling không trích xuất được nội dung từ tệp {attachment.name}{page_hint}. "
            "Có thể tệp không có text layer hợp lệ hoặc định dạng không phù hợp với bộ đọc hiện tại."
        )

    def _decode_data_url(self, value: str) -> bytes:
        try:
            _, encoded = value.split(",", 1)
            return base64.b64decode(encoded, validate=True)
        except (ValueError, base64.binascii.Error) as exc:
            raise ValueError("file_data_url không phải data URL base64 hợp lệ.") from exc
