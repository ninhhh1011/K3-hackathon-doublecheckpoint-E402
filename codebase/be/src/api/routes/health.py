from fastapi import APIRouter

from src.core.config import settings
from src.models.schemas import HealthResponse

router = APIRouter(tags=["health"])


def _health_response() -> HealthResponse:
    return HealthResponse(
        status="healthy",
        version=settings.app_version,
        environment=settings.app_env,
    )


@router.get("/", response_model=HealthResponse)
async def read_root() -> HealthResponse:
    return _health_response()


@router.get("/health", response_model=HealthResponse)
async def healthcheck() -> HealthResponse:
    return _health_response()

