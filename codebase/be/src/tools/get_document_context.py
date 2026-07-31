import json

from src.tools.tool_utils import call_llm, tool, truncate_text


@tool
def get_document_context(document_text: str) -> str:
    """Extract concise study context from parsed Docling text or any raw document text."""
    text = document_text.strip()
    if not text:
        return json.dumps(
            {"summary": "", "key_points": [], "note": "Không có văn bản tài liệu đầu vào."},
            ensure_ascii=False,
        )

    prompt = (
        "Tóm tắt ngữ cảnh học tập bằng tiếng Việt. "
        "Trả về JSON với 3 trường: summary, key_points, note. "
        "key_points là mảng 3-5 ý ngắn gọn, trung tính và dễ học."
        f"\n\nTài liệu:\n{truncate_text(text, 12000)}"
    )
    fallback = {
        "summary": truncate_text(text, 300),
        "key_points": [
            "Cần đọc kỹ các khái niệm chính trong tài liệu.",
            "Nên trích xuất các ý cốt lõi để làm ngữ cảnh học tập.",
            "Có thể thay parser Docling bằng output thực tế sau này.",
        ],
        "note": "Đang dùng fallback hoặc stub cho lớp Docling context.",
    }
    return call_llm(
        system_prompt="You turn parsed study documents into concise Vietnamese learning context.",
        user_prompt=prompt,
        json_output=True,
        fallback=fallback,
    )
