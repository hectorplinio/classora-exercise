"""Test data builders: valid objects by default, override only what each test cares about."""

from dataclasses import replace
from datetime import UTC, date, datetime
from typing import Any
from uuid import UUID

from tickets.domain.ticket.model import Severity, Ticket, TicketState
from tickets.domain.user.model import Permission, User

TODAY = date(2026, 10, 30)
NOW = datetime(2026, 10, 30, 12, 0, tzinfo=UTC)

_DEFAULT_TICKET = Ticket(
    id=UUID("b7c1e0de-6f0a-4f43-9a55-0a2f6c1d8e11"),
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
    return replace(_DEFAULT_TICKET, **overrides)


def a_user(team: str = "Payments", *permissions: Permission) -> User:
    return User(team=team, permissions=frozenset(permissions))
