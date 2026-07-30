from fastapi import APIRouter, Response, status

from src.api.deps import AgentServiceDep
from src.models.schemas import (
    MaterialResponse,
    QuizDeclineRequest,
    QuizRequest,
    QuizResponse,
    TutorTurnRequest,
    TutorTurnResponse,
)

router = APIRouter(tags=["tutor"])


@router.get("/materials/{material_id}", response_model=MaterialResponse)
async def get_material(material_id: str, agent_service: AgentServiceDep) -> MaterialResponse:
    return await agent_service.get_material(material_id)


@router.post("/tutor/turns", response_model=TutorTurnResponse)
async def create_turn(
    payload: TutorTurnRequest,
    agent_service: AgentServiceDep,
) -> TutorTurnResponse:
    return await agent_service.create_tutor_turn(payload)


@router.post("/tutor/quiz", response_model=QuizResponse)
async def create_quiz(payload: QuizRequest, agent_service: AgentServiceDep) -> QuizResponse:
    return await agent_service.create_quiz(payload)


@router.post("/tutor/declines", status_code=status.HTTP_204_NO_CONTENT)
async def decline_quiz(
    payload: QuizDeclineRequest,
    agent_service: AgentServiceDep,
) -> Response:
    await agent_service.decline_quiz()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
