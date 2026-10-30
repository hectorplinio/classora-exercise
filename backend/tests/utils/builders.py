"""Test data builders: valid objects by default, override only what each test cares about."""

from dataclasses import replace
from datetime import UTC, date, datetime
from typing import Any
from uuid import uuid4

from tickets.domain.ticket.model import Severity, Ticket, TicketState
from tickets.domain.user.model import Permission, User

TODAY = date(2026, 10, 30)
NOW = datetime(2026, 10, 30, 12, 0, tzinfo=UTC)

_DEFAULT_TICKET = Ticket(
    id=uuid4(),
    key="SEC-1024",
    title="Log4j vulnerable version in payments-api",
    asset="payments-api",
    creator_team="Security Champions",
    assigned_team="Payments",
    assignee="jdoe@example.com",
    severity=Severity.HIGH,
    state=TicketState.REPORTED,
    restricted=False,
    target_date=date(2026, 11, 30),
    due_date=None,
    created_at=datetime(2026, 10, 1, 9, 12, tzinfo=UTC),
    last_modified=datetime(2026, 10, 20, 15, 40, tzinfo=UTC),
)


def a_ticket(**overrides: Any) -> Ticket:
    """A valid ticket with a fresh id; override only what the test cares about."""
    return replace(_DEFAULT_TICKET, **{"id": uuid4(), **overrides})


def a_user(team: str = "Payments", *permissions: Permission) -> User:
    return User(team=team, permissions=frozenset(permissions))
