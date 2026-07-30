from fastapi.testclient import TestClient

from main import app


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
