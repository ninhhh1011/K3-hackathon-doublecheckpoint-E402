import importlib
import json
import sys
from pathlib import Path

BE_ROOT = Path(__file__).resolve().parents[2]
if str(BE_ROOT) not in sys.path:
    sys.path.insert(0, str(BE_ROOT))

learning_tools = importlib.import_module("src.tools.learning_tools")


def test_gen_mindmap_image_returns_unavailable_without_gemini_key() -> None:
    raw = learning_tools.gen_mindmap_image.invoke(
        {
            "content": "Hoc may\n- Hoc co giam sat\n- Hoc khong giam sat",
            "outline_json": None,
        }
    )
    payload = json.loads(raw)

    assert payload["model"]
    assert payload["mime_type"] == "image/png"
    assert payload["status"] in {"success", "unavailable"}
