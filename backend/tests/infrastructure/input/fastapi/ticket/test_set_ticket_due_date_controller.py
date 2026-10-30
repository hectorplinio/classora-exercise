from datetime import timedelta
from uuid import uuid4

import pytest

from tests.utils.api import DEVELOPER, SECURITY, TEAM_LEAD, api_client
from tests.utils.builders import NOW, TODAY, a_ticket
from tickets.domain.ticket.model import TicketState


def url(ticket_id: object) -> str:
    return f"/api/v1/tickets/{ticket_id}"


def test_sets_the_due_date_moves_reported_to_in_progress_and_updates_last_modified() -> None:
    ticket = a_ticket(state=TicketState.REPORTED, due_date=None)
    client = api_client(ticket)
    due_date = (TODAY + timedelta(days=7)).isoformat()

    response = client.patch(url(ticket.id), json={"dueDate": due_date}, headers=TEAM_LEAD)

    assert response.status_code == 200
    body = response.json()
    assert body["dueDate"] == due_date
    assert body["state"] == "IN_PROGRESS"
    assert body["lastModified"] == NOW.isoformat().replace("+00:00", "Z")
    # The change is persisted: the detail returns the updated ticket.
    assert client.get(url(ticket.id), headers=TEAM_LEAD).json() == body


def test_today_is_a_valid_due_date() -> None:
    ticket = a_ticket()

    response = api_client(ticket).patch(
        url(ticket.id), json={"dueDate": TODAY.isoformat()}, headers=TEAM_LEAD
    )

    assert response.status_code == 200


def test_without_update_permission_is_forbidden() -> None:
    ticket = a_ticket()

    response = api_client(ticket).patch(
        url(ticket.id), json={"dueDate": TODAY.isoformat()}, headers=DEVELOPER
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "The tickets.update permission is required."


def test_permission_is_checked_before_existence() -> None:
    response = api_client().patch(
        url(uuid4()), json={"dueDate": TODAY.isoformat()}, headers=DEVELOPER
    )

    assert response.status_code == 403


def test_missing_ticket_is_not_found() -> None:
    response = api_client().patch(
        url(uuid4()), json={"dueDate": TODAY.isoformat()}, headers=TEAM_LEAD
    )

    assert response.status_code == 404


def test_restricted_ticket_of_another_team_is_not_found() -> None:
    ticket = a_ticket(restricted=True, creator_team="Identity", assigned_team="Identity")
    client = api_client(ticket)
    body = {"dueDate": TODAY.isoformat()}

    assert client.patch(url(ticket.id), json=body, headers=TEAM_LEAD).status_code == 404
    assert client.patch(url(ticket.id), json=body, headers=SECURITY).status_code == 200


def test_done_ticket_is_a_conflict() -> None:
    ticket = a_ticket(state=TicketState.DONE)

    response = api_client(ticket).patch(
        url(ticket.id), json={"dueDate": TODAY.isoformat()}, headers=TEAM_LEAD
    )

    assert response.status_code == 409
    assert response.headers["content-type"] == "application/problem+json"


def test_due_date_before_today_is_unprocessable_with_the_field() -> None:
    ticket = a_ticket()
    yesterday = (TODAY - timedelta(days=1)).isoformat()

    response = api_client(ticket).patch(
        url(ticket.id), json={"dueDate": yesterday}, headers=TEAM_LEAD
    )

    assert response.status_code == 422
    assert response.json()["invalidParams"] == [
        {"name": "dueDate", "reason": f"Must be {TODAY.isoformat()} or later."}
    ]


@pytest.mark.parametrize(
    "body",
    [
        {},
        {"dueDate": None},
        {"dueDate": "15/11/2026"},
        {"dueDate": "2026-02-30"},
        {"dueDate": "2026-11-15T10:00:00Z"},
        {"dueDate": 1794787200},
        {"dueDate": "2026-11-15", "state": "DONE"},
    ],
    ids=["empty", "null", "format", "impossible-date", "date-time", "timestamp", "extra-field"],
)
def test_malformed_body_is_unprocessable(body: dict[str, object]) -> None:
    ticket = a_ticket()

    response = api_client(ticket).patch(url(ticket.id), json=body, headers=TEAM_LEAD)

    assert response.status_code == 422
    assert response.json()["invalidParams"]
