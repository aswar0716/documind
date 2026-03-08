"""
Smoke tests — verify the app can be imported and basic structure is correct.
These tests run without any external services (no ChromaDB, no OpenAI).
"""
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_endpoint_returns_ok():
    """The /health endpoint should always be reachable and return status ok."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_documents_list_endpoint_exists():
    """GET /api/v1/documents/ should exist (even if ChromaDB is not running)."""
    response = client.get("/api/v1/documents/")
    # 200 (empty list) or 500 (ChromaDB not init) — either way, route exists
    assert response.status_code in (200, 500)


def test_upload_rejects_non_pdf():
    """Upload endpoint must reject files that are not PDFs."""
    response = client.post(
        "/api/v1/documents/upload",
        files={"file": ("note.txt", b"some text content", "text/plain")},
    )
    assert response.status_code == 415
    assert "PDF" in response.json()["detail"]
