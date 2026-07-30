from pathlib import Path
import sys

from fastapi.testclient import TestClient

BE_ROOT = Path(__file__).resolve().parents[2]
if str(BE_ROOT) not in sys.path:
    sys.path.insert(0, str(BE_ROOT))

from main import app


client = TestClient(app)


def test_healthcheck() -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "healthy"
