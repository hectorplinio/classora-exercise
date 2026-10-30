"""Smoke tests of the real wiring in main.py: system clock, seeded repository and use cases."""

from fastapi.testclient import TestClient

from tests.utils.api import DEVELOPER, SECURITY
from tickets.main import create_app

STATEMENT_TICKET_ID = "b7c1e0de-6f0a-4f43-9a55-0a2f6c1d8e11"


def test_serves_the_seeded_statement_ticket() -> None:
    client = TestClient(create_app())

    response = client.get(f"/api/v1/tickets/{STATEMENT_TICKET_ID}", headers=DEVELOPER)

    assert response.status_code == 200
    assert response.json()["key"] == "SEC-1024"


def test_serves_the_current_user() -> None:
    response = TestClient(create_app()).get("/api/v1/me", headers=SECURITY)

    assert response.json()["team"] == "Security Champions"
