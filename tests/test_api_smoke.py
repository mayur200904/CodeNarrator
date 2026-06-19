from fastapi.testclient import TestClient

from server.app import app


client = TestClient(app)


def test_openapi_schema_available() -> None:
    response = client.get("/openapi.json")
    assert response.status_code == 200
    assert response.json().get("openapi")


def test_missing_job_returns_404() -> None:
    response = client.get("/api/jobs/non-existent-job")
    assert response.status_code == 404
