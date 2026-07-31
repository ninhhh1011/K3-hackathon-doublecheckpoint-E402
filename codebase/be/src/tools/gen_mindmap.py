import json

from src.tools.tool_utils import call_llm, tool, truncate_text


@tool
def gen_mindmap(context: str) -> str:
    """Generate a simple mindmap JSON from study context."""
    normalized = context.strip()
    if not normalized:
        return json.dumps(
            {"rootId": "root", "nodes": [], "edges": [], "note": "Không có ngữ cảnh đầu vào."},
            ensure_ascii=False,
        )

    prompt = (
        "Tạo sơ đồ tư duy bằng tiếng Việt từ context học tập. "
        "Trả về JSON với rootId, nodes, edges, note. "
        "Mỗi node gồm id, label. Mỗi edge gồm source, target, label."
        f"\n\nContext:\n{truncate_text(normalized, 12000)}"
    )
    fallback = {
        "rootId": "root",
        "nodes": [
            {"id": "root", "label": "Chủ đề chính"},
            {"id": "n1", "label": "Khái niệm cốt lõi"},
            {"id": "n2", "label": "Thành phần quan trọng"},
            {"id": "n3", "label": "Ứng dụng thực tế"},
        ],
        "edges": [
            {"source": "root", "target": "n1", "label": "gồm"},
            {"source": "root", "target": "n2", "label": "mở rộng"},
            {"source": "root", "target": "n3", "label": "áp dụng"},
        ],
        "note": "Đang dùng mindmap generator mặc định; có thể thay bằng schema chi tiết hơn.",
    }
    return call_llm(
        system_prompt="You convert learning context into a compact Vietnamese mindmap schema.",
        user_prompt=prompt,
        json_output=True,
        fallback=fallback,
    )
