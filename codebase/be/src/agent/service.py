from src.models.schemas import ChatRequest, ChatResponse


class AgentService:
    """Small placeholder service for future agent integration."""

    async def chat(self, payload: ChatRequest) -> ChatResponse:
        conversation_id = payload.conversation_id or "conv-demo"
        return ChatResponse(
            response=f"Received: {payload.message}",
            conversation_id=conversation_id,
            sources=[],
        )

