import json

from src.tools.tool_utils import call_llm, tool, truncate_text


@tool
def get_image_pdf(image_or_pdf_context: str) -> str:
    """Describe images or PDF visual content for VLM-style understanding."""
    context = image_or_pdf_context.strip()
    if not context:
        return json.dumps(
            {"description": "", "visual_elements": [], "note": "Không có ngữ cảnh ảnh hoặc PDF đầu vào."},
            ensure_ascii=False,
        )

    prompt = (
        "Bạn đóng vai VLM cho tài liệu học tập. "
        "Dựa trên mô tả đầu vào, hãy trả về JSON với description, visual_elements, note. "
        "Nếu thiếu ảnh gốc thì phải ghi rõ giới hạn này trong note."
        f"\n\nInput:\n{truncate_text(context, 8000)}"
    )
    fallback = {
        "description": "Không có ảnh gốc để phân tích trực tiếp; chỉ mô tả được dựa trên văn bản đầu vào.",
        "visual_elements": [
            "Có thể có slide, hình minh họa hoặc trang PDF liên quan đến nội dung học tập.",
            "Cần nối VLM thật sự nếu muốn đọc chi tiết hình ảnh.",
        ],
        "note": "Stub VLM: hiện mới xử lý text mô tả, chưa đọc file ảnh hoặc PDF trực tiếp.",
    }
    return call_llm(
        system_prompt="You explain visual learning materials in concise Vietnamese.",
        user_prompt=prompt,
        json_output=True,
        fallback=fallback,
    )
