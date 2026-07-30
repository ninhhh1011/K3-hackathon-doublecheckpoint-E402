from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from src.api.deps import AgentServiceDep
from src.models.schemas import ChatRequest, ChatResponse, MaterialResponse

router = APIRouter(tags=["chat"])


@router.get("/materials/{material_id}", response_model=MaterialResponse)
async def get_material(material_id: str, agent_service: AgentServiceDep) -> MaterialResponse:
    return await agent_service.get_material(material_id)


@router.post(
    "/chat",
    response_model=ChatResponse,
    responses={
        200: {
            "description": "Returns JSON when stream=false, or SSE events when stream=true.",
            "content": {
                "application/json": {},
                "text/event-stream": {},
            },
        }
    },
)
async def create_chat(payload: ChatRequest, agent_service: AgentServiceDep):
    if payload.stream:
        return StreamingResponse(
            agent_service.stream_chat(payload),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "X-Accel-Buffering": "no",
            },
        )
    return await agent_service.chat(payload)
