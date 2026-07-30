from pathlib import Path

from fastapi import APIRouter, HTTPException, Request, Response, status
from fastapi.responses import FileResponse

from src.api.deps import AgentServiceDep
from src.models.schemas import (
    MaterialResponse,
    QuizDeclineRequest,
    QuizRequest,
    QuizResponse,
    TutorTurnRequest,
    TutorTurnResponse,
)

router = APIRouter(prefix="/api", tags=["tutor"])
PROJECT_ROOT = Path(__file__).resolve().parents[5]
DEMO_MATERIAL_ID = "demo-slides"
DEMO_DOCUMENT = PROJECT_ROOT / "demo-slides.pdf"


def require_demo_material(material_id: str) -> None:
    if material_id != DEMO_MATERIAL_ID:
        raise HTTPException(status_code=404, detail="Material not found.")


@router.get("/materials/{material_id}", response_model=MaterialResponse)
async def get_material(material_id: str, request: Request) -> MaterialResponse:
    require_demo_material(material_id)
    return MaterialResponse(
        id=material_id,
        title="VLearn Adaptive Tutor — Demo",
        courseCode="VLEARN-DEMO",
        pageNumber=1,
        pageCount=10,
        documentUrl=str(
            request.url_for("get_material_document", material_id=material_id)
        ),
        sourceIds=[f"demo-slides:p{page}" for page in range(1, 11)],
    )


@router.get(
    "/materials/{material_id}/document",
    response_class=FileResponse,
    name="get_material_document",
)
async def get_material_document(material_id: str) -> FileResponse:
    require_demo_material(material_id)
    if not DEMO_DOCUMENT.is_file():
        raise HTTPException(status_code=500, detail="Document is unavailable.")
    return FileResponse(
        DEMO_DOCUMENT,
        media_type="application/pdf",
        filename=DEMO_DOCUMENT.name,
        content_disposition_type="inline",
    )


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
