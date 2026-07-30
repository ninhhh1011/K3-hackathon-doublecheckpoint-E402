from fastapi import APIRouter

from src.api.deps import AgentServiceDep
from src.models.schemas import ChatRequest, ChatResponse

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("", response_model=ChatResponse)
async def create_chat(payload: ChatRequest, agent_service: AgentServiceDep) -> ChatResponse:
    return await agent_service.chat(payload)

