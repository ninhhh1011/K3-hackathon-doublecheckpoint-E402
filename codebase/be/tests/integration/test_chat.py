import importlib
import sys
from pathlib import Path

from fastapi.testclient import TestClient

BE_ROOT = Path(__file__).resolve().parents[2]
if str(BE_ROOT) not in sys.path:
    sys.path.insert(0, str(BE_ROOT))

app = importlib.import_module("main").app


client = TestClient(app)


def test_chat_json_response() -> None:
    response = client.post(
        "/api/v1/chat",
        json={
            "message": "Giai thich slide nay",
            "page_number": 3,
            "source_ids": ["SRC-003"],
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert "response" in payload
    assert payload["sources"] == ["SRC-003"]


def test_chat_history_is_accepted() -> None:
    response = client.post(
        "/api/v1/chat",
        json={
            "message": "toi vua hoi cau gi",
            "page_number": 1,
            "history": [
                {"role": "user", "content": "1+1 bang may"},
                {"role": "assistant", "content": "1+1 bang 2."},
            ],
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert "response" in payload


def test_chat_request_validation_returns_422() -> None:
    response = client.post("/api/v1/chat", json={"message": "   "})

    assert response.status_code == 422
    assert response.json()["detail"]


def test_chat_streaming_response() -> None:
    with client.stream(
        "POST",
        "/api/v1/chat",
        json={
            "message": "Tom tat slide giup em",
            "stream": True,
            "page_number": 2,
        },
    ) as response:
        body = response.read().decode()

    assert response.status_code == 200
    assert "event: trace" in body
    assert "event: message_delta" in body
    assert "event: final" in body


def test_chat_streams_document_and_image_tool_trace() -> None:
    with client.stream(
        "POST",
        "/api/v1/chat",
        json={
            "message": "Giải thích các ngữ cảnh này",
            "stream": True,
            "page_number": 5,
            "attachments": [
                {
                    "name": "slide.pdf",
                    "kind": "pdf",
                    "purpose": "current_document",
                    "mime_type": "application/pdf",
                    "text_content": "Nội dung đã trích xuất của slide 5.",
                },
                {
                    "name": "diagram.png",
                    "kind": "image",
                    "purpose": "attachment",
                    "mime_type": "image/png",
                    "image_data_url": "data:image/png;base64,AA==",
                },
            ],
        },
    ) as response:
        body = response.read().decode()

    assert response.status_code == 200
    assert "parse_current_slide" in body
    assert "understand_image" in body
    assert "event: message_delta" in body


def test_chat_streams_fallback_when_docling_extracts_empty_text() -> None:
    with client.stream(
        "POST",
        "/api/v1/chat",
        json={
            "message": "doc tep nay giup em",
            "stream": True,
            "page_number": 1,
            "attachments": [
                {
                    "name": "scan.pdf",
                    "kind": "pdf",
                    "purpose": "attachment",
                    "mime_type": "application/pdf",
                    "file_data_url": "data:application/pdf;base64,JVBERi0xLjQKJUVPRg==",
                },
            ],
        },
    ) as response:
        body = response.read().decode()

    assert response.status_code == 200
    assert "parse_attached_document" in body
    assert "Docling khong trich xuat duoc noi dung tu tep scan.pdf" in body
    assert "event: final" in body
