from fastapi import APIRouter

from src.core.config import settings
from src.models.schemas import HealthResponse

router = APIRouter(tags=["health"])


@router.get("/", response_model=HealthResponse)
async def read_root() -> HealthResponse:
    return HealthResponse(
        status="ok",
        version=settings.app_version,
        environment=settings.app_env,
    )


@router.get("/health", response_model=HealthResponse)
async def healthcheck() -> HealthResponse:
    return HealthResponse(
        status="healthy",
        version=settings.app_version,
        environment=settings.app_env,
    )

