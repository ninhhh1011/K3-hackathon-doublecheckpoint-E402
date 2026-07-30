import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.agent import AgentService
from src.api.routes import chat, health, tutor
from src.core.config import settings
from src.core.logging import configure_logging


@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging(settings.log_level)
    logger = logging.getLogger(__name__)
    logger.info("Starting backend API")
    app.state.agent_service = AgentService()
    yield
    logger.info("Stopping backend API")


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description="Backend API for VinAIAction.",
        lifespan=lifespan,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(health.router)
    app.include_router(chat.router, prefix=settings.api_prefix)
    app.include_router(tutor.router, prefix=settings.api_prefix)
    return app


app = create_app()

