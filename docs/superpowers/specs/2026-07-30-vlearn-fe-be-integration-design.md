# VLearn FE–BE integration design

## Goal

Connect the existing React reader and FastAPI tutor backend, then load the
repository's `demo-slides.pdf` as the default review document.

## Architecture

- FastAPI remains the source of truth for material metadata and document bytes.
- `GET /api/materials/demo-slides` returns metadata whose `documentUrl` points to
  a FastAPI PDF endpoint.
- The PDF endpoint streams `demo-slides.pdf` from the repository root with
  `application/pdf`; unknown material IDs return `404`.
- Vite proxies `/api` to `http://127.0.0.1:8000` during local development.
- The frontend defaults to material ID `demo-slides` when the URL does not
  contain `materialId`. An explicit query parameter still takes precedence.

## Data flow

1. The browser opens the frontend.
2. The frontend requests `GET /api/materials/demo-slides`.
3. FastAPI validates the material ID and returns title, course code, page
   metadata, source IDs, and the PDF URL.
4. Reader embeds the returned PDF URL.
5. Tutor requests continue to use the existing `/api/tutor/*` endpoints and the
   material context returned by the backend.

## Error handling

- A missing PDF is reported as a server error without exposing an arbitrary
  filesystem path.
- Unknown materials return `404`.
- Invalid material responses remain rejected by the frontend validator.
- Reader keeps its existing loading and error states.

## Testing

- Backend integration tests cover material metadata, PDF response headers/body,
  and unknown material IDs.
- Frontend tests cover the default `demo-slides` ID and explicit query override.
- Existing frontend and backend checks must remain green.

## Scope

This integration does not add upload, document indexing, PDF text extraction,
page synchronization, or new AI behavior.
