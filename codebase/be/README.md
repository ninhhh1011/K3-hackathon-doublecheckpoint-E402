# VinAIAction Backend

Backend `be` duoc xay dung voi FastAPI, theo cau truc tach lop de sau nay de mo rong sang agent thuc te, OpenAI client, LangGraph, logging, va test.

Trang thai hien tai:
- Da co bo khung FastAPI theo `src/api`, `src/core`, `src/models`, `src/agent`
- Da co `health check` endpoint
- Da co `chat` endpoint de test luong request/response
- Da co `Settings` load tu `.env`
- Da co test tich hop co ban cho `/health`
- Chua noi OpenAI that trong source hien tai, service chat dang la placeholder

## Cau truc thu muc

```text
be/
|-- main.py
|-- pyproject.toml
|-- requirements.txt
|-- src/
|   |-- agent/
|   |   |-- __init__.py
|   |   `-- service.py
|   |-- api/
|   |   |-- __init__.py
|   |   |-- deps.py
|   |   `-- routes/
|   |       |-- __init__.py
|   |       |-- chat.py
|   |       `-- health.py
|   |-- core/
|   |   |-- __init__.py
|   |   |-- config.py
|   |   `-- logging.py
|   `-- models/
|       |-- __init__.py
|       `-- schemas.py
`-- tests/
    `-- integration/
        `-- test_health.py
|-- main.py
```

## Chuc nang hien tai

### 1. Health check

Kiem tra backend da khoi dong thanh cong:

- `GET /`
- `GET /health`

Response mau:

```json
{
  "status": "healthy",
  "version": "0.1.0",
  "environment": "development"
}
```

### 2. Chat API

Endpoint:

- `POST /api/v1/chat`

Request body:

```json
{
  "message": "Xin chao",
  "conversation_id": "conv-001",
  "stream": false
}
```

Response hien tai:

```json
{
  "response": "Received: Xin chao",
  "conversation_id": "conv-001",
  "sources": [],
  "timestamp": "2026-07-30T00:00:00Z"
}
```

Luu y: response tren duoc tao boi `AgentService` dang o dang placeholder. No chua goi OpenAI API.

## Moi truong yeu cau

- Python `3.11+`
- Khuyen nghi dung virtual environment

Kiem tra version:

```bash
python --version
```

## Cai dat

Tu thu muc `codebase/be`:

```bash
python -m venv .venv
```

Kich hoat moi truong:

Windows PowerShell:

```powershell
.venv\Scripts\Activate.ps1
```

macOS/Linux:

```bash
source .venv/bin/activate
```

Cai dependencies:

```bash
pip install -r requirements.txt
```

Hoac cai theo `pyproject.toml`:

```bash
pip install -e ".[dev]"
```

## Cau hinh `.env`

File `.env` hien tai can it nhat:

```env
OPENAI_API_KEY=your_openai_api_key
```

Trong source hien tai, `OPENAI_API_KEY` da duoc khai bao trong `src/core/config.py`, san sang cho buoc tich hop OpenAI sau.

Neu muon mo rong them, co the them cac bien sau:

```env
APP_NAME=VinAIAction API
APP_VERSION=0.1.0
APP_ENV=development
LOG_LEVEL=INFO
API_PREFIX=/api/v1
```

## Chay du an

De review luong Reader + Tutor, chay backend tu thu muc `codebase/be`:

```powershell
python -m uvicorn main:app --reload
```

Sau do chay frontend tu `codebase/fe` bang `npm.cmd run dev` va mo
`http://127.0.0.1:5173/`. Backend phuc vu metadata tai
`/api/v1/materials/demo-slides` va PDF tai
`/api/v1/materials/demo-slides/document`.

Co 3 cach chay:

### Cach 1. Dung FastAPI CLI

```bash
fastapi dev
```

Vi `pyproject.toml` da khai bao:

```toml
[tool.fastapi]
entrypoint = "src.api.main:app"
```

### Cach 2. Dung uvicorn

```bash
uvicorn src:app --reload
```

### Cach 3. Dung entrypoint tuong thich

```bash
uvicorn main:app --reload
```

## API Docs

Sau khi chay server, mo:

- `http://127.0.0.1:8000/docs`
- `http://127.0.0.1:8000/redoc`

## Chay test

Chay toan bo test:

```bash
pytest
```

Chay rieng test health:

```bash
pytest tests/integration/test_health.py -q
```

## Mo ta cac thanh phan chinh

### `src/api/main.py`

Noi tao `FastAPI app`, cau hinh `lifespan`, `CORS`, va dang ky routers.

### `src/api/routes/health.py`

Chua 2 endpoint:
- `/`
- `/health`

### `src/api/routes/chat.py`

Chua endpoint `POST /api/v1/chat`.

### `src/api/deps.py`

Quan ly dependency injection cho `AgentService`.

### `src/agent/service.py`

Service tam thoi cho agent. Hien tai chi tra lai message da nhan de test backend flow.

### `src/core/config.py`

Noi khai bao `Settings` bang `pydantic-settings`, doc cau hinh tu file `.env`.

### `src/models/schemas.py`

Chua cac schema:
- `ChatRequest`
- `ChatResponse`
- `HealthResponse`

## Huong mo rong tiep theo

Backend nay da san sang cho cac buoc tiep theo:

1. Them OpenAI client rieng, vi du `src/agent/openai_client.py`
2. Thay logic placeholder trong `AgentService` bang loi goi OpenAI that
3. Them streaming endpoint neu can chat realtime
4. Them error handling, auth, logging request, va rate limit
5. Them unit test cho `AgentService` va integration test cho `/api/v1/chat`
6. Tach `agent` thanh `graph.py`, `state.py`, `nodes.py`, `tools.py` neu ban se dung LangGraph

## Luu y

- File `main.py` o root chi la entrypoint tuong thich, app chinh nam o `src/api/main.py`
- `requirements.txt` da bao gom thu vien `openai`, nhung source chua goi OpenAI that
- Neu ban muon chuyen sang agent that, nen tao them abstraction cho provider thay vi goi truc tiep trong route

## Lenh nhanh

```bash
pip install -r requirements.txt
fastapi dev
pytest
```
