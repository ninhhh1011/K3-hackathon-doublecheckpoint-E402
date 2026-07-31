import asyncio
from typing import Any

import numpy as np

from src.core.config import settings
from src.core.logging import logger
from src.services.database_service import DatabaseService


class RAGService:
    def __init__(self) -> None:
        self._embedding_model: Any | None = None
        self._embedding_init_lock = asyncio.Lock()
        self._database_service = DatabaseService()

    async def warmup(self) -> None:
        model = await self._ensure_embedding_model()
        logger.info(
            "Embedding model preloaded successfully with model=%s, device=%s, top_k=%s, threshold=%.3f.",
            settings.vlearn_embedding_model,
            getattr(model, "device", "unknown"),
            settings.vlearn_rag_top_k,
            settings.vlearn_rag_score_threshold,
        )

    async def retrieve(self, query: str) -> dict[str, object]:
        normalized_query = query.strip()
        if not normalized_query:
            return self._empty_retrieval_result()

        try:
            embedding = await self._embed_query(normalized_query)
            grouped_results = await asyncio.to_thread(
                self._database_service.hybrid_search_documents,
                normalized_query,
                embedding,
            )
            return self._filter_grouped_results(grouped_results)
        except Exception:
            logger.exception("Failed to retrieve RAG results for query")
            return self._empty_retrieval_result()

    def format_context_blocks(self, rag_results: list[dict[str, object]]) -> list[str]:
        if not rag_results:
            return []

        lines = ["Ngữ cảnh RAG truy xuất từ DB bằng hybrid retrieval (cosine + BM25-like):"]
        for index, item in enumerate(rag_results, start=1):
            combined_score = float(item["combined_score"])
            cosine_score = float(item["cosine_score"])
            bm25_score = float(item["bm25_score"])
            source_type = str(item["source_type"])
            source_id = str(item["source_id"])
            content = str(item["content"])
            extra_content = str(item["extra_content"])
            methods = ", ".join(item["retrieval_methods"]) if isinstance(item["retrieval_methods"], list) else ""

            if source_type == "chat_qa":
                block = (
                    f"{index}. [chat_qa:{source_id}] combined={combined_score:.3f}, cosine={cosine_score:.3f}, bm25={bm25_score:.3f}\n"
                    f"Phương thức match: {methods or 'không xác định'}\n"
                    f"Câu hỏi gần nhất: {content}\n"
                    f"Trả lời liên quan: {extra_content}"
                )
            else:
                title_prefix = f"Tiêu đề: {extra_content}\n" if extra_content else ""
                block = (
                    f"{index}. [transcript:{source_id}] combined={combined_score:.3f}, cosine={cosine_score:.3f}, bm25={bm25_score:.3f}\n"
                    f"Phương thức match: {methods or 'không xác định'}\n"
                    f"{title_prefix}Nội dung liên quan: {content}"
                )
            lines.append(block)

        return ["\n".join(lines)]

    def _filter_grouped_results(
        self,
        grouped_results: dict[str, list[dict[str, object]]],
    ) -> dict[str, object]:
        top_k = max(settings.vlearn_rag_top_k, 1)
        threshold = settings.vlearn_rag_score_threshold
        sources: dict[str, dict[str, object]] = {}
        accepted_flat: list[dict[str, object]] = []

        for source_name in ("chat_qa", "transcript"):
            raw_items = grouped_results.get(source_name, [])
            accepted_items = [
                item
                for item in raw_items
                if float(item["cosine_score"]) >= threshold or float(item["bm25_score"]) > 0
            ][:top_k]
            sources[source_name] = {
                "top_k": top_k,
                "score_threshold": threshold,
                "retrieved_count": len(raw_items),
                "accepted_count": len(accepted_items),
                "results": accepted_items,
                "raw_results": raw_items,
            }
            accepted_flat.extend(accepted_items)

        accepted_flat.sort(key=lambda item: float(item["combined_score"]), reverse=True)
        return {
            "results": accepted_flat,
            "sources": sources,
        }

    def _empty_retrieval_result(self) -> dict[str, object]:
        return {
            "results": [],
            "sources": {
                "chat_qa": {
                    "top_k": max(settings.vlearn_rag_top_k, 1),
                    "score_threshold": settings.vlearn_rag_score_threshold,
                    "retrieved_count": 0,
                    "accepted_count": 0,
                    "results": [],
                    "raw_results": [],
                },
                "transcript": {
                    "top_k": max(settings.vlearn_rag_top_k, 1),
                    "score_threshold": settings.vlearn_rag_score_threshold,
                    "retrieved_count": 0,
                    "accepted_count": 0,
                    "results": [],
                    "raw_results": [],
                },
            },
        }

    async def _ensure_embedding_model(self) -> Any:
        if self._embedding_model is not None:
            return self._embedding_model

        async with self._embedding_init_lock:
            if self._embedding_model is not None:
                return self._embedding_model

            def load_model() -> Any:
                from sentence_transformers import SentenceTransformer

                kwargs: dict[str, Any] = {}
                if settings.vlearn_embedding_device.strip():
                    kwargs["device"] = settings.vlearn_embedding_device.strip()
                model = SentenceTransformer(settings.vlearn_embedding_model, **kwargs)
                model.max_seq_length = 512
                return model

            self._embedding_model = await asyncio.to_thread(load_model)
            return self._embedding_model

    async def _embed_query(self, query: str) -> np.ndarray:
        model = await self._ensure_embedding_model()

        def encode() -> np.ndarray:
            vector = model.encode(
                [self._format_query(query)],
                show_progress_bar=False,
                convert_to_numpy=True,
                normalize_embeddings=True,
            )
            vector = np.asarray(vector, dtype=np.float32)
            if vector.ndim != 2 or vector.shape[0] != 1:
                raise RuntimeError(f"Invalid query embedding shape: {vector.shape}")
            if vector.shape[1] != settings.vlearn_embedding_dim:
                raise RuntimeError(
                    f"Embedding dim mismatch: got {vector.shape[1]}, expected {settings.vlearn_embedding_dim}."
                )
            return vector[0]

        return await asyncio.to_thread(encode)

    def _format_query(self, query: str) -> str:
        return f"query: {query}" if "e5" in settings.vlearn_embedding_model.lower() else query
