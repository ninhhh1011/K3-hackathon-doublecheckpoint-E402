from fastapi import APIRouter, HTTPException, status

from src.api.deps import AgentServiceDep
from src.models.schemas import ChatRequest, ChatResponse
from src.core.logging import logger

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("", response_model=ChatResponse)
async def create_chat(payload: ChatRequest, agent_service: AgentServiceDep) -> ChatResponse:
    try:
        logger.info(
            "Received chat request: conversation_id=%s, message_length=%s",
            payload.conversation_id,
            len(payload.message),
        )
        response = await agent_service.chat(payload)
        logger.info("Generated response for conversation_id=%s", response.conversation_id)
        return response
    except HTTPException:
        raise
    except Exception:
        logger.exception("Error processing chat request")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process chat request.",
        )

