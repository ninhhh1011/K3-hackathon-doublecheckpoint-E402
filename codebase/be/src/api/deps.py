from typing import Annotated

from fastapi import Depends, Request

from src.agent import AgentService


def get_agent_service(request: Request) -> AgentService:
    agent_service = getattr(request.app.state, "agent_service", None)
    if agent_service is None:
        agent_service = AgentService()
        request.app.state.agent_service = agent_service
    return agent_service


AgentServiceDep = Annotated[AgentService, Depends(get_agent_service)]

