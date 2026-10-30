from datetime import UTC, date, datetime, timedelta
from uuid import UUID, uuid4

from tests.utils.api import DEVELOPER, SECURITY, api_client
from tests.utils.builders import TODAY, a_ticket
from tickets.domain.ticket.model import Severity, TicketState


def test_returns_the_ticket_in_the_contract_format() -> None:
    ticket = a_ticket(
        id=UUID("b7c1e0de-6f0a-4f43-9a55-0a2f6c1d8e11"),
        severity=Severity.HIGH,
        state=TicketState.IN_PROGRESS,
        target_date=date(2026, 11, 30),
        due_date=date(2026, 11, 15),
        created_at=datetime(2026, 10, 1, 9, 12, tzinfo=UTC),
        last_modified=datetime(2026, 10, 20, 15, 40, tzinfo=UTC),
    )

    response = api_client(ticket).get(f"/api/v1/tickets/{ticket.id}", headers=DEVELOPER)

    assert response.status_code == 200
    assert response.json() == {
        "id": "b7c1e0de-6f0a-4f43-9a55-0a2f6c1d8e11",
        "key": "SEC-1024",
        "title": "Log4j vulnerable version in payments-api",
        "asset": "payments-api",
        "creatorTeam": "Security Champions",
        "assignedTeam": "Payments",
        "assignee": "jdoe@example.com",
        "severity": "HIGH",
        "state": "IN_PROGRESS",
        "restricted": False,
        "targetDate": "2026-11-30",
        "dueDate": "2026-11-15",
        "expired": False,
        "createdAt": "2026-10-01T09:12:00Z",
        "lastModified": "2026-10-20T15:40:00Z",
    }


def test_expired_is_computed_with_the_server_clock() -> None:
    ticket = a_ticket(state=TicketState.IN_PROGRESS, target_date=TODAY - timedelta(days=1))

    response = api_client(ticket).get(f"/api/v1/tickets/{ticket.id}", headers=DEVELOPER)

    assert response.json()["expired"] is True


def test_due_date_null_is_returned_as_null() -> None:
    ticket = a_ticket(due_date=None)

    response = api_client(ticket).get(f"/api/v1/tickets/{ticket.id}", headers=DEVELOPER)

    assert response.json()["dueDate"] is None


def test_missing_ticket_is_not_found() -> None:
    response = api_client().get(f"/api/v1/tickets/{uuid4()}", headers=DEVELOPER)

    assert response.status_code == 404
    assert response.headers["content-type"] == "application/problem+json"
    assert response.json()["title"] == "Not Found"


def test_restricted_ticket_of_another_team_is_not_found() -> None:
    ticket = a_ticket(restricted=True, creator_team="Identity", assigned_team="Identity")
    client = api_client(ticket)

    hidden = client.get(f"/api/v1/tickets/{ticket.id}", headers=DEVELOPER)
    visible = client.get(f"/api/v1/tickets/{ticket.id}", headers=SECURITY)

    assert hidden.status_code == 404
    assert hidden.json()["detail"] == f"Ticket {ticket.id} not found."
    assert visible.status_code == 200


def test_without_read_permission_is_forbidden() -> None:
    ticket = a_ticket()

    response = api_client(ticket).get(
        f"/api/v1/tickets/{ticket.id}", headers={"X-User-Team": "Payments"}
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "The tickets.read permission is required."


def test_without_team_is_unauthorized() -> None:
    response = api_client().get(f"/api/v1/tickets/{uuid4()}")

    assert response.status_code == 401


def test_malformed_id_is_unprocessable_with_the_invalid_param() -> None:
    response = api_client().get("/api/v1/tickets/not-a-uuid", headers=DEVELOPER)

    assert response.status_code == 422
    assert response.headers["content-type"] == "application/problem+json"
    body = response.json()
    assert body["title"] == "Unprocessable Content"
    assert [param["name"] for param in body["invalidParams"]] == ["id"]
