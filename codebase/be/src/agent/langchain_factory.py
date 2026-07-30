from langchain.agents import create_agent

from src.core.config import settings
from src.tools import LEARNING_TOOLS


SYSTEM_PROMPT = (
    "You are a helpful Vietnamese learning assistant. "
    "Use the available tools when the user asks to search tài liệu, lấy ngữ cảnh tài liệu, "
    "phân tích ảnh/PDF, sinh câu hỏi hoặc tạo mindmap."
)


def build_learning_agent(model: str | None = None):
    """Create a LangChain agent preloaded with the project's learning tools."""
    return create_agent(
        model=model or settings.openai_model,
        tools=LEARNING_TOOLS,
        system_prompt=SYSTEM_PROMPT,
    )
