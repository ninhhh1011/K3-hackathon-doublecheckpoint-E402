# VinAIAction Backend

Backend `be` hien duoc chinh lai theo huong mot API chat duy nhat cho nguoi dung: `POST /api/v1/chat`.

## Trang thai hien tai

- Chi con mot chat API trung tam cho VLearn Tutor
- Ho tro 2 che do tra ve:
  - JSON thong thuong khi `stream=false`
  - `text/event-stream` khi `stream=true`
- Validation request duoc dinh nghia trong Pydantic schema
- Neu client gui sai format, FastAPI tu dong tra `422` cung chi tiet loi
- Material metadata van co the lay qua `GET /api/v1/materials/{material_id}`

## API chinh

### `POST /api/v1/chat`

Request body mau:

```json
{
  "message": "Giai thich bieu do nay",
  "conversation_id": "conv-001",
  "stream": false,
  "material_id": "demo-material",
  "page_number": 4,
  "source_ids": ["SRC-004"],
  "selected_text": "Scaled dot-product attention...",
  "contexts": [
    {
      "type": "text",
      "page_number": 4,
      "text": "Scaled dot-product attention computes softmax(QK^T / sqrt(dk)) V."
    }
  ]
}
```

JSON response mau:

```json
{
  "response": "Day la cau tra loi cua VLearn Tutor...",
  "conversation_id": "conv-001",
  "sources": ["SRC-004"],
  "trace": [
    {
      "type": "node_start",
      "node_name": "router_planner",
      "payload": {
        "question": "Giai thich bieu do nay",
        "page_number": 4,
        "has_image_context": false
      }
    }
  ],
  "timestamp": "2026-07-30T00:00:00Z"
}
```

Streaming response mau:

```text
event: trace
data: {"type":"node_start","node_name":"router_planner","payload":{"question":"..."}}

event: message_delta
data: {"delta":"Minh da nhan duoc ..."}

event: final
data: {"response":"...","conversation_id":"...","sources":[],"trace":[],"timestamp":"..."}
```

## Validation

Khong validate thu cong trong route handler.

- Rang buoc do dai, `page_number >= 1`, va format context nam trong `src/models/schemas.py`
- Request sai se duoc FastAPI/Pydantic tra `422 Unprocessable Entity`

## Chay nhanh

```bash
pip install -r requirements.txt
fastapi dev
pytest
```

## Tai lieu ky thuat

Bo spec chi tiet cho multi-model VLearn Tutor nam tai:

`be/docs/vlearn_tutor_agent_spec.md`
