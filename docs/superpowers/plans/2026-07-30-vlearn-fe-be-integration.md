# VLearn FE–BE Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect the existing React frontend to FastAPI and load `demo-slides.pdf` in Reader by default.

**Architecture:** FastAPI owns material metadata and streams the repository PDF. The frontend requests the existing `/api/v1/materials/:id` contract, while Vite proxies local `/api` traffic to FastAPI.

**Tech Stack:** FastAPI, Starlette `FileResponse`, React, TypeScript, Vite, Pytest, Vitest

---

### Task 1: Serve the review document from FastAPI

**Files:**
- Modify: `codebase/be/src/api/routes/tutor.py`
- Create: `codebase/be/tests/integration/test_materials.py`

- [ ] **Step 1: Write failing endpoint tests**

```python
from fastapi.testclient import TestClient

from codebase.be.main import app


def test_demo_material_returns_pdf_url() -> None:
    with TestClient(app) as client:
        response = client.get("/api/v1/materials/demo-slides")

    assert response.status_code == 200
    assert response.json()["documentUrl"].endswith(
        "/api/v1/materials/demo-slides/document"
    )
    assert response.json()["pageCount"] == 10


def test_demo_document_returns_pdf() -> None:
    with TestClient(app) as client:
        response = client.get("/api/v1/materials/demo-slides/document")

    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert response.content.startswith(b"%PDF")


def test_unknown_material_returns_404() -> None:
    with TestClient(app) as client:
        response = client.get("/api/v1/materials/unknown")

    assert response.status_code == 404
```

- [ ] **Step 2: Run tests and verify RED**

Run:

```powershell
python -m pytest tests/integration/test_materials.py -q
```

Expected: metadata lacks `documentUrl`, document endpoint is missing, and unknown IDs do not return `404`.

- [ ] **Step 3: Implement the material and document endpoints**

In `codebase/be/src/api/routes/tutor.py`, define the single supported material and serve it:

```python
from pathlib import Path

from fastapi import APIRouter, HTTPException, Request, Response, status
from fastapi.responses import FileResponse

PROJECT_ROOT = Path(__file__).resolve().parents[5]
DEMO_MATERIAL_ID = "demo-slides"
DEMO_DOCUMENT = PROJECT_ROOT / "demo-slides.pdf"


def require_demo_material(material_id: str) -> None:
    if material_id != DEMO_MATERIAL_ID:
        raise HTTPException(status_code=404, detail="Material not found.")


@router.get("/materials/{material_id}", response_model=MaterialResponse)
async def get_material(material_id: str, request: Request) -> MaterialResponse:
    require_demo_material(material_id)
    return MaterialResponse(
        id=material_id,
        title="VLearn Adaptive Tutor — Demo",
        courseCode="VLEARN-DEMO",
        pageNumber=1,
        pageCount=10,
        documentUrl=str(
            request.url_for("get_material_document", material_id=material_id)
        ),
        sourceIds=[f"demo-slides:p{page}" for page in range(1, 11)],
    )


@router.get(
    "/materials/{material_id}/document",
    response_class=FileResponse,
    name="get_material_document",
)
async def get_material_document(material_id: str) -> FileResponse:
    require_demo_material(material_id)
    if not DEMO_DOCUMENT.is_file():
        raise HTTPException(status_code=500, detail="Document is unavailable.")
    return FileResponse(
        DEMO_DOCUMENT,
        media_type="application/pdf",
        filename=DEMO_DOCUMENT.name,
        content_disposition_type="inline",
    )
```

- [ ] **Step 4: Run backend tests and verify GREEN**

Run:

```powershell
python -m pytest -q
```

Expected: all backend tests pass.

### Task 2: Load the default material from React

**Files:**
- Modify: `codebase/fe/src/App.tsx`
- Modify: `codebase/fe/src/App.test.tsx`
- Modify: `codebase/fe/vite.config.ts`

- [ ] **Step 1: Write failing material-ID tests**

Add to `codebase/fe/src/App.test.tsx`:

```tsx
import App, { resolveMaterialId } from "./App";

it("loads demo slides when materialId is absent", () => {
  expect(resolveMaterialId("")).toBe("demo-slides");
});

it("keeps an explicit materialId", () => {
  expect(resolveMaterialId("?materialId=lesson-42")).toBe("lesson-42");
});
```

Update the server-render assertion to expect the loading state because the
default document now loads immediately.

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```powershell
npm.cmd test -- src/App.test.tsx
```

Expected: `resolveMaterialId` is not exported and the previous empty-state assertion fails.

- [ ] **Step 3: Implement default selection and local proxy**

In `codebase/fe/src/App.tsx`:

```tsx
export function resolveMaterialId(search: string): string {
  return new URLSearchParams(search).get("materialId")?.trim() || "demo-slides";
}

function queryMaterialId(): string {
  return resolveMaterialId(
    typeof window === "undefined" ? "" : window.location.search,
  );
}
```

In `codebase/fe/vite.config.ts`:

```ts
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://127.0.0.1:8000",
    },
  },
});
```

- [ ] **Step 4: Run frontend checks and verify GREEN**

Run:

```powershell
npm.cmd run lint
npm.cmd test
npm.cmd run build
```

Expected: lint, all Vitest tests, TypeScript, and Vite build pass.

### Task 3: Verify the integrated review flow

**Files:**
- Modify: `codebase/be/README.md`
- Modify: `codebase/fe/README.md`

- [ ] **Step 1: Document the two local start commands**

Backend:

```powershell
cd codebase\be
python -m uvicorn main:app --reload
```

Frontend:

```powershell
cd codebase\fe
npm.cmd run dev
```

Open `http://127.0.0.1:5173/`.

- [ ] **Step 2: Start both services and inspect the browser**

Verify that:

- the header shows the demo document title;
- Reader embeds `demo-slides.pdf`;
- Tutor accepts a message using the returned material context;
- browser console contains no errors.

- [ ] **Step 3: Run the final repository checks**

Run:

```powershell
python -m pytest -q
npm.cmd run lint
npm.cmd test
npm.cmd run build
git diff --check
```

Expected: all commands pass and the diff contains only the approved integration scope.
