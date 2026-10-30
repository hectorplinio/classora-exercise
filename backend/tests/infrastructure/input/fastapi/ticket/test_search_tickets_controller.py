from datetime import UTC, datetime, timedelta
from typing import Any

import pytest

from tests.utils.api import DEVELOPER, SECURITY, api_client
from tests.utils.builders import TODAY, a_ticket
from tickets.domain.ticket.model import Severity, Ticket, TicketState

URL = "/api/v1/tickets"


def keys(body: dict[str, Any]) -> list[str]:
    return [ticket["key"] for ticket in body["data"]]


def test_returns_a_page_with_data_and_pagination() -> None:
    tickets = [a_ticket(key=f"SEC-{n}") for n in range(1, 4)]

    response = api_client(*tickets).get(URL, params={"limit": 2}, headers=DEVELOPER)

    assert response.status_code == 200
    body = response.json()
    assert len(body["data"]) == 2
    assert body["pagination"] == {"offset": 0, "limit": 2, "totalElements": 3}
    assert set(body["data"][0]) >= {"id", "key", "creatorTeam", "targetDate", "expired"}


def test_hidden_tickets_are_neither_listed_nor_counted() -> None:
    visible = a_ticket(key="SEC-1")
    hidden = a_ticket(
        key="SEC-2", restricted=True, creator_team="Identity", assigned_team="Identity"
    )
    client = api_client(visible, hidden)

    as_developer = client.get(URL, headers=DEVELOPER).json()
    as_security = client.get(URL, headers=SECURITY).json()

    assert keys(as_developer) == ["SEC-1"]
    assert as_developer["pagination"]["totalElements"] == 1
    assert as_security["pagination"]["totalElements"] == 2


def test_default_order_is_last_modified_descending() -> None:
    tickets = [
        a_ticket(key="SEC-1", last_modified=datetime(2026, 10, 1, tzinfo=UTC)),
        a_ticket(key="SEC-2", last_modified=datetime(2026, 10, 3, tzinfo=UTC)),
    ]

    assert keys(api_client(*tickets).get(URL, headers=DEVELOPER).json()) == ["SEC-2", "SEC-1"]


def test_filters_search_and_sort_from_query_parameters() -> None:
    tickets = [
        a_ticket(key="SEC-1", title="Log4j", state=TicketState.IN_PROGRESS, severity=Severity.HIGH),
        a_ticket(key="SEC-2", title="Log4j", state=TicketState.DONE, severity=Severity.HIGH),
        a_ticket(key="SEC-3", title="LOG4J", state=TicketState.REPORTED, severity=Severity.HIGH),
        a_ticket(key="SEC-4", title="Log4j", state=TicketState.REPORTED, severity=Severity.LOW),
        a_ticket(key="SEC-5", title="TLS", state=TicketState.REPORTED, severity=Severity.HIGH),
    ]
    query = "q=log4j&state=IN_PROGRESS&state=REPORTED&severity=HIGH&sort=KEY&direction=DESC"

    response = api_client(*tickets).get(f"{URL}?{query}", headers=DEVELOPER)

    assert keys(response.json()) == ["SEC-3", "SEC-1"]


def test_assigned_team_and_expired_only_use_camel_case_names() -> None:
    tickets = [
        a_ticket(key="SEC-1", assigned_team="Payments", target_date=TODAY - timedelta(days=1)),
        a_ticket(key="SEC-2", assigned_team="Payments", target_date=TODAY + timedelta(days=1)),
        a_ticket(key="SEC-3", assigned_team="Identity", target_date=TODAY - timedelta(days=1)),
    ]

    response = api_client(*tickets).get(
        URL, params={"assignedTeam": "Payments", "expiredOnly": "true"}, headers=DEVELOPER
    )

    assert keys(response.json()) == ["SEC-1"]


def test_pages_never_overlap_and_repeat_the_same_order() -> None:
    same_time = datetime(2026, 10, 1, tzinfo=UTC)
    tickets: list[Ticket] = [a_ticket(key=f"SEC-{n}", last_modified=same_time) for n in range(7)]
    client = api_client(*tickets)

    pages = [
        keys(client.get(URL, params={"offset": offset, "limit": 3}, headers=DEVELOPER).json())
        for offset in (0, 3, 6)
    ]
    again = keys(client.get(URL, params={"offset": 0, "limit": 3}, headers=DEVELOPER).json())

    flattened = [key for page in pages for key in page]
    assert sorted(flattened) == sorted(t.key for t in tickets)
    assert len(set(flattened)) == len(flattened)
    assert again == pages[0]


@pytest.mark.parametrize(
    ("query", "invalid_param"),
    [
        ("offset=-1", "offset"),
        ("limit=0", "limit"),
        ("limit=101", "limit"),
        (f"q={'x' * 257}", "q"),
        ("state=FOO", "state.0"),
        ("state=DONE&state=DONE", "state"),
        ("severity=high", "severity.0"),
        ("sort=TITLE", "sort"),
        ("direction=asc", "direction"),
        ("expiredOnly=maybe", "expiredOnly"),
    ],
)
def test_invalid_parameter_is_unprocessable(query: str, invalid_param: str) -> None:
    response = api_client().get(f"{URL}?{query}", headers=DEVELOPER)

    assert response.status_code == 422
    assert response.headers["content-type"] == "application/problem+json"
    assert [param["name"] for param in response.json()["invalidParams"]] == [invalid_param]


def test_without_read_permission_is_forbidden() -> None:
    response = api_client().get(URL, headers={"X-User-Team": "Payments"})

    assert response.status_code == 403


def test_without_team_is_unauthorized() -> None:
    assert api_client().get(URL).status_code == 401
