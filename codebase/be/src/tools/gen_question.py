import json

from src.tools.tool_utils import call_llm, tool, truncate_text


@tool
def gen_question(context: str) -> str:
    """Generate one Vietnamese multiple-choice study question from context."""
    normalized = context.strip()
    if not normalized:
        return json.dumps(
            {
                "question": "",
                "choices": [],
                "correctIndex": None,
                "explanation": "Không có ngữ cảnh để tạo câu hỏi.",
            },
            ensure_ascii=False,
        )

    prompt = (
        "Tạo 1 câu hỏi trắc nghiệm bằng tiếng Việt dựa trên context. "
        "Trả về JSON hợp lệ với question, choices, correctIndex, explanation. "
        "choices phải có đúng 4 lựa chọn, correctIndex nằm trong khoảng 0-3."
        f"\n\nContext:\n{truncate_text(normalized, 12000)}"
    )
    fallback = {
        "question": "Nội dung trong đoạn học tập này nhấn mạnh điều gì?",
        "choices": [
            "Ý chính của đoạn kiến thức",
            "Thông tin không liên quan",
            "Hướng dẫn xóa tài liệu",
            "Nội dung ngoài chủ đề",
        ],
        "correctIndex": 0,
        "explanation": "Lựa chọn 1 phù hợp nhất với mục tiêu ôn tập từ context.",
    }
    return call_llm(
        system_prompt="You generate accurate Vietnamese multiple-choice questions for studying.",
        user_prompt=prompt,
        json_output=True,
        fallback=fallback,
    )
