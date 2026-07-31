import json

from src.services import DatabaseService, RAGService
from src.tools.tool_utils import tool

_rag_service = RAGService()
_database_service = DatabaseService()


@tool
async def search_documents(query: str) -> str:
    """Search document chunks in the database for RAG and return candidate passages with source IDs."""
    normalized = query.strip()
    if not normalized:
        return json.dumps({"query": "", "results": [], "note": "Truy vấn rỗng."}, ensure_ascii=False)

    try:
        results = await _rag_service.retrieve(normalized)
        note = "Kết quả lấy từ vector DB."
    except Exception:
        results = []
        note = "Không truy vấn được vector DB."

    if not results:
        try:
            results = _database_service.keyword_search(normalized, top_k=5)
            note = "Fallback sang keyword search trên DB."
        except Exception:
            results = []
            note = "Không truy vấn được DB."

    payload = []
    for item in results[:5]:
        payload.append(
            {
                "source_type": item["source_type"],
                "source_id": item["source_id"],
                "title": item["extra_content"] or None,
                "snippet": item["content"],
                "score": round(float(item["score"]), 4),
            }
        )

    return json.dumps(
        {
            "query": normalized,
            "results": payload,
            "note": note,
        },
        ensure_ascii=False,
    )
