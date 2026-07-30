import json
from datetime import UTC, datetime
from uuid import uuid4

from openai import AsyncOpenAI

from src.core.config import settings
from src.core.logging import logger
from src.models.schemas import (
    ChatRequest,
    ChatResponse,
    MaterialResponse,
    MindMap,
    MindMapEdge,
    MindMapNode,
    QuizRequest,
    QuizResponse,
    TutorMessage,
    TutorTurnRequest,
    TutorTurnResponse,
)


class AgentService:
    """Service layer for chat and tutor flows."""

    def __init__(self) -> None:
        self._client = AsyncOpenAI(api_key=settings.openai_api_key) if settings.openai_api_key else None

    async def chat(self, payload: ChatRequest) -> ChatResponse:
        conversation_id = payload.conversation_id or str(uuid4())

        try:
            response_text = await self._generate_text(
                prompt=payload.message,
                system_message=(
                    "You are a helpful Vietnamese learning assistant. "
                    "Answer clearly, briefly, and practically in Vietnamese."
                ),
            )
            return ChatResponse(
                response=response_text,
                conversation_id=conversation_id,
                sources=[],
                timestamp=datetime.now(UTC),
            )
        except Exception:
            logger.exception("Failed to generate chat response")
            return ChatResponse(
                response="Sorry, an error occurred while generating the answer.",
                conversation_id=conversation_id,
                sources=[],
                timestamp=datetime.now(UTC),
            )

    async def get_material(self, material_id: str) -> MaterialResponse:
        return MaterialResponse(
            id=material_id,
            title="Tai lieu hoc tap demo",
            courseCode="VINAI-101",
            pageNumber=1,
            pageCount=12,
            sourceIds=["SRC-001", "SRC-002", "SRC-003"],
        )

    async def create_tutor_turn(self, payload: TutorTurnRequest) -> TutorTurnResponse:
        citations = payload.sourceIds[:2] or ["SRC-001"]
        next_action = self._decide_next_action(payload.message, payload.sourceIds)
        answer = await self._generate_text(
            prompt=self._build_tutor_prompt(payload, next_action),
            system_message=(
                "You are VLearn Tutor. Reply in Vietnamese. "
                "Ground the explanation in the provided study context. "
                "Do not mention unavailable sources. Keep the tone supportive."
            ),
        )
        message = TutorMessage(
            id=f"tutor-{uuid4()}",
            role="tutor",
            content=answer,
            citations=citations if next_action != "safe_reply" else citations[:1],
        )
        if next_action == "mindmap":
            return TutorTurnResponse(
                message=message,
                nextAction=next_action,
                mindmap=self._build_mindmap(payload.sourceIds),
            )
        return TutorTurnResponse(message=message, nextAction=next_action)

    async def create_quiz(self, payload: QuizRequest) -> QuizResponse:
        citations = payload.sourceIds[:2] or ["SRC-001"]
        quiz_json = await self._generate_text(
            prompt=(
                "Tao 1 cau hoi trac nghiem tieng Viet de kiem tra hieu bai. "
                "Tra ve JSON hop le voi cac truong: question, choices, correctIndex, explanation. "
                "choices phai la mang dung 3 lua chon khac nhau, correctIndex la 0, 1 hoac 2."
            ),
            system_message="You generate concise educational quizzes in Vietnamese and return only JSON.",
            json_output=True,
        )
        try:
            parsed = json.loads(quiz_json)
            choices = parsed.get("choices", [])
            if not isinstance(choices, list) or len(choices) != 3:
                raise ValueError("Invalid choices")
            return QuizResponse(
                question=str(parsed.get("question", "Cau hoi on tap la gi?")),
                choices=[str(choice) for choice in choices[:3]],
                correctIndex=int(parsed.get("correctIndex", 0)),
                explanation=str(parsed.get("explanation", "Day la giai thich ngan gon.")),
                citations=citations,
            )
        except Exception:
            return QuizResponse(
                question="Y chinh cua doan kien thuc nay la gi?",
                choices=[
                    "Tom tat mot y trong bai hoc",
                    "Xoa toan bo ngu canh",
                    "Bo qua phan giai thich",
                ],
                correctIndex=0,
                explanation="Lua chon dung la phuong an tom tat dung theo ngu canh hoc tap.",
                citations=citations,
            )

    async def decline_quiz(self) -> None:
        return None

    async def _generate_text(
        self,
        prompt: str,
        system_message: str,
        json_output: bool = False,
    ) -> str:
        if not self._client:
            logger.warning("OPENAI_API_KEY is missing, using fallback response.")
            return self._fallback_response(prompt, json_output=json_output)

        request_kwargs = {
            "model": settings.openai_model,
            "messages": [
                {"role": "system", "content": system_message},
                {"role": "user", "content": prompt},
            ],
        }
        if json_output:
            request_kwargs["response_format"] = {"type": "json_object"}

        response = await self._client.chat.completions.create(**request_kwargs)
        content = response.choices[0].message.content
        if isinstance(content, str) and content.strip():
            return content.strip()
        return self._fallback_response(prompt, json_output=json_output)

    def _fallback_response(self, prompt: str, json_output: bool = False) -> str:
        if json_output:
            return json.dumps(
                {
                    "question": "Noi dung nay nhan manh dieu gi?",
                    "choices": [
                        "Mot y chinh cua bai hoc",
                        "Thong tin ngoai le khong lien quan",
                        "Huong dan xoa tai lieu",
                    ],
                    "correctIndex": 0,
                    "explanation": "Phuong an 1 phu hop voi muc tieu on tap kien thuc.",
                }
            )
        return f"Minh da nhan cau hoi cua ban: {prompt[:300]}"

    def _decide_next_action(self, message: str, source_ids: list[str]) -> str:
        normalized = message.lower()
        if source_ids and any(keyword in normalized for keyword in ["so do", "mind map", "mindmap", "tom tat"]):
            return "mindmap"
        if source_ids and any(keyword in normalized for keyword in ["quiz", "cau hoi", "kiem tra"]):
            return "quiz_suggested"
        return "safe_reply"

    def _build_tutor_prompt(self, payload: TutorTurnRequest, next_action: str) -> str:
        selected_text = payload.selectedText or "Khong co doan boi den."
        return (
            f"Hoc vien dang o material {payload.materialId}, trang {payload.pageNumber}. "
            f"Source IDs hop le: {', '.join(payload.sourceIds) if payload.sourceIds else 'khong co'}. "
            f"Doan text duoc chon: {selected_text}. "
            f"Cau hoi: {payload.message}. "
            f"Neu phu hop, huong dan hoc tiep theo theo kieu {next_action}."
        )

    def _build_mindmap(self, source_ids: list[str]) -> MindMap:
        citations = source_ids[:1] or ["SRC-001"]
        nodes = [
            MindMapNode(id="root", label="Chu de chinh", citations=citations),
            MindMapNode(id="n1", label="Khai niem cot loi", citations=citations),
            MindMapNode(id="n2", label="Cach van hanh", citations=citations),
            MindMapNode(id="n3", label="Ung dung", citations=citations),
        ]
        edges = [
            MindMapEdge(source="root", target="n1", label="gom"),
            MindMapEdge(source="root", target="n2", label="giai thich"),
            MindMapEdge(source="root", target="n3", label="ap dung"),
        ]
        return MindMap(rootId="root", nodes=nodes, edges=edges)
