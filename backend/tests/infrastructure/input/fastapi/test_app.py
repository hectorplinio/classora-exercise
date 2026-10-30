from fastapi.testclient import TestClient

from tickets.main import create_app


def test_app_starts_and_serves_its_openapi_document() -> None:
    client = TestClient(create_app())

    response = client.get("/openapi.json")

    assert response.status_code == 200
    assert response.json()["info"]["title"] == "Mini Tickets API"
