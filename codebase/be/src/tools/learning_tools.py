import json
from typing import Any

from langchain.tools import tool
from openai import OpenAI

from src.core.config import settings
from src.core.logging import logger


def _get_openai_client() -> OpenAI | None:
    if not settings.openai_api_key:
        return None
    return OpenAI(api_key=settings.openai_api_key)


def _truncate_text(value: str, limit: int = 4000) -> str:
    cleaned = " ".join(value.split())
    if len(cleaned) <= limit:
        return cleaned
    return f"{cleaned[:limit].rstrip()}..."


def _call_llm(
    *,
    system_prompt: str,
    user_prompt: str,
    json_output: bool = False,
    fallback: str | dict[str, Any],
) -> str:
    client = _get_openai_client()
    if not client:
        return json.dumps(fallback, ensure_ascii=False) if isinstance(fallback, dict) else fallback

    try:
        request_kwargs: dict[str, Any] = {
            "model": settings.openai_model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        }
        if json_output:
            request_kwargs["response_format"] = {"type": "json_object"}

        response = client.chat.completions.create(**request_kwargs)
        content = response.choices[0].message.content
        if isinstance(content, str) and content.strip():
            return content.strip()
    except Exception:
        logger.exception("Tool LLM call failed")

    return json.dumps(fallback, ensure_ascii=False) if isinstance(fallback, dict) else fallback


@tool
def search_documents(query: str) -> str:
    """Search document chunks for RAG and return candidate passages with source IDs."""
    normalized = query.strip()
    if not normalized:
        return json.dumps({"query": "", "results": [], "note": "Empty query."}, ensure_ascii=False)

    results = [
        {
            "source_id": "SRC-RAG-001",
            "title": "Tai lieu RAG demo",
            "snippet": f"Doan van ban phu hop nhat voi truy van '{normalized}'.",
            "score": 0.92,
        },
        {
            "source_id": "SRC-RAG-002",
            "title": "Tai lieu bo sung",
            "snippet": "Day la doan van ban lien quan de mo rong ngu canh.",
            "score": 0.78,
        },
    ]
    return json.dumps(
        {
            "query": normalized,
            "results": results,
            "note": "Dang dung stub RAG. Thay bang vector DB retriever khi san sang.",
        },
        ensure_ascii=False,
    )


@tool
def get_document_context(document_text: str) -> str:
    """Extract concise study context from parsed Docling text or any raw document text."""
    text = document_text.strip()
    if not text:
        return json.dumps(
            {"summary": "", "key_points": [], "note": "No document text provided."},
            ensure_ascii=False,
        )

    prompt = (
        "Tom tat ngu canh hoc tap bang tieng Viet. "
        "Tra ve JSON voi 3 truong: summary, key_points, note. "
        "key_points la mang 3-5 y ngan gon, trung tinh va de hoc."
        f"\n\nTai lieu:\n{_truncate_text(text, 12000)}"
    )
    fallback = {
        "summary": _truncate_text(text, 300),
        "key_points": [
            "Can doc ky cac khai niem chinh trong tai lieu.",
            "Nen trich xuat cac y cot loi de lam ngu canh hoc tap.",
            "Co the thay parser Docling bang output thuc te sau nay.",
        ],
        "note": "Dang dung fallback/stub cho lop Docling context.",
    }
    return _call_llm(
        system_prompt="You turn parsed study documents into concise Vietnamese learning context.",
        user_prompt=prompt,
        json_output=True,
        fallback=fallback,
    )


@tool
def get_image_pdf(image_or_pdf_context: str) -> str:
    """Describe images or PDF visual content for VLM-style understanding."""
    context = image_or_pdf_context.strip()
    if not context:
        return json.dumps(
            {"description": "", "visual_elements": [], "note": "No image/PDF context provided."},
            ensure_ascii=False,
        )

    prompt = (
        "Ban dong vai VLM cho tai lieu hoc tap. "
        "Dua tren mo ta dau vao, hay tra ve JSON voi description, visual_elements, note. "
        "Neu thieu anh goc thi phai ghi ro gioi han nay trong note."
        f"\n\nInput:\n{_truncate_text(context, 8000)}"
    )
    fallback = {
        "description": "Khong co anh goc de phan tich truc tiep; chi mo ta duoc dua tren van ban dau vao.",
        "visual_elements": [
            "Co the co slide, hinh minh hoa hoac trang PDF lien quan den noi dung hoc tap.",
            "Can noi VLM that su neu muon doc chi tiet hinh anh.",
        ],
        "note": "Stub VLM: hien moi xu ly text mo ta, chua doc file anh/PDF truc tiep.",
    }
    return _call_llm(
        system_prompt="You explain visual learning materials in concise Vietnamese.",
        user_prompt=prompt,
        json_output=True,
        fallback=fallback,
    )


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
                "explanation": "Khong co context de tao cau hoi.",
            },
            ensure_ascii=False,
        )

    prompt = (
        "Tao 1 cau hoi trac nghiem bang tieng Viet dua tren context. "
        "Tra ve JSON hop le voi question, choices, correctIndex, explanation. "
        "choices phai co dung 4 lua chon, correctIndex nam trong khoang 0-3."
        f"\n\nContext:\n{_truncate_text(normalized, 12000)}"
    )
    fallback = {
        "question": "Noi dung trong doan hoc tap nay nhan manh dieu gi?",
        "choices": [
            "Y chinh cua doan kien thuc",
            "Thong tin khong lien quan",
            "Huong dan xoa tai lieu",
            "Noi dung ngoai chu de",
        ],
        "correctIndex": 0,
        "explanation": "Lua chon 1 phu hop nhat voi muc tieu on tap tu context.",
    }
    return _call_llm(
        system_prompt="You generate accurate Vietnamese multiple-choice questions for studying.",
        user_prompt=prompt,
        json_output=True,
        fallback=fallback,
    )


@tool
def gen_mindmap(context: str) -> str:
    """Generate a simple mindmap JSON from study context."""
    normalized = context.strip()
    if not normalized:
        return json.dumps(
            {"rootId": "root", "nodes": [], "edges": [], "note": "No context provided."},
            ensure_ascii=False,
        )

    prompt = (
        "Tao so do tu duy bang tieng Viet tu context hoc tap. "
        "Tra ve JSON voi rootId, nodes, edges, note. "
        "Moi node gom id, label. Moi edge gom source, target, label."
        f"\n\nContext:\n{_truncate_text(normalized, 12000)}"
    )
    fallback = {
        "rootId": "root",
        "nodes": [
            {"id": "root", "label": "Chu de chinh"},
            {"id": "n1", "label": "Khai niem cot loi"},
            {"id": "n2", "label": "Thanh phan quan trong"},
            {"id": "n3", "label": "Ung dung thuc te"},
        ],
        "edges": [
            {"source": "root", "target": "n1", "label": "gom"},
            {"source": "root", "target": "n2", "label": "mo rong"},
            {"source": "root", "target": "n3", "label": "ap dung"},
        ],
        "note": "Dang dung mindmap generator mac dinh; co the thay bang schema chi tiet hon.",
    }
    return _call_llm(
        system_prompt="You convert learning context into a compact Vietnamese mindmap schema.",
        user_prompt=prompt,
        json_output=True,
        fallback=fallback,
    )


LEARNING_TOOLS = [
    search_documents,
    get_document_context,
    get_image_pdf,
    gen_question,
    gen_mindmap,
]
