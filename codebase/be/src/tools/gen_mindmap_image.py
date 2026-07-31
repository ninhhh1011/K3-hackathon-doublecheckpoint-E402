import json

from src.core.config import settings
from src.services import GeminiImageService
from src.tools.tool_utils import tool

_gemini_service = GeminiImageService()


def _mindmap_image_prompt(content: str, outline_json: str | None = None) -> str:
    outline_block = f"\nOutline JSON:\n{outline_json.strip()}\n" if outline_json and outline_json.strip() else ""
    return (
        "Create a clean educational mind map image from the content below.\n\n"
        "Requirements:\n"
        "- Central topic in the middle\n"
        "- Clear hierarchical branches\n"
        "- Modern infographic style\n"
        "- White background\n"
        "- Distinct colors for major branches\n"
        "- Minimal decorative icons\n"
        "- All labels must be written in Vietnamese\n"
        "- Text must be large, readable, and spelled correctly\n"
        "- 16:9 landscape composition\n"
        "- Do not add information not provided\n"
        "- If an outline JSON is provided, prioritize it over the raw content\n\n"
        f"Content:\n{content.strip()}\n"
        f"{outline_block}"
    )


@tool
def gen_mindmap_image(content: str, outline_json: str | None = None) -> str:
    """Generate a Vietnamese educational mind map image and return a JSON payload with a data URL."""
    normalized = content.strip()
    if not normalized:
        return json.dumps(
            {
                "status": "error",
                "model": settings.vlearn_mindmap_image_model,
                "image_data_url": None,
                "mime_type": "image/png",
                "note": "Không có nội dung để tạo ảnh mindmap.",
            },
            ensure_ascii=False,
        )

    result = _gemini_service.generate_mindmap_image(_mindmap_image_prompt(normalized, outline_json))
    return result.model_dump_json()
