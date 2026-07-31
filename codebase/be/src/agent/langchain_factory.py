from src.core.config import settings
from src.tools import LEARNING_TOOLS


SYSTEM_PROMPT = (
    "You are VLearn AI Agent, a Vietnamese study assistant inside a document reader. "
    "Treat highlighted text as supporting context instead of a separate command. "
    "Use the student's latest message to determine intent. "
    "RAG retrieval has already been executed by the backend before you run, so use the provided grounded context directly. "
    "Use tools only when they materially improve the answer. "
    "When creating a mind map, return structured graph data rather than an image description. "
    "If an attachment cannot be read directly, say so clearly instead of pretending it was parsed."
)


def build_learning_agent(model: str | None = None):
    """Create a LangChain agent preloaded with the project's learning tools."""
    from langchain.agents import create_agent
    from langchain_openai import ChatOpenAI

    chat_model = ChatOpenAI(
        model=model or settings.openai_model,
        api_key=settings.openai_api_key,
    )

    return create_agent(
        model=chat_model,
        tools=LEARNING_TOOLS,
        system_prompt=SYSTEM_PROMPT,
    )
