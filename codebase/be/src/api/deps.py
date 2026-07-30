from typing import Annotated

from fastapi import Depends, Request

from src.agent import AgentService


def get_agent_service(request: Request) -> AgentService:
    return request.app.state.agent_service


AgentServiceDep = Annotated[AgentService, Depends(get_agent_service)]

