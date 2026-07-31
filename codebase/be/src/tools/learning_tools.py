from .gen_mindmap import gen_mindmap
from .gen_mindmap_image import gen_mindmap_image
from .gen_question import gen_question
from .get_document_context import get_document_context
from .get_image_pdf import get_image_pdf

LEARNING_TOOLS = [
    get_document_context,
    get_image_pdf,
    gen_question,
    gen_mindmap,
    gen_mindmap_image,
]
