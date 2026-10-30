import re
from datetime import UTC, datetime, timedelta
from uuid import UUID

import pytest

from tests.utils.builders import a_user
from tickets.domain.ticket.model import Severity, Ticket, TicketState
from tickets.domain.user.model import Permission
from tickets.infrastructure.output.ticket.in_memory.seed import build_seed_tickets

NOW = datetime(2026, 10, 30, 12, 0, tzinfo=UTC)
TICKETS = build_seed_tickets(NOW)
DEVELOPER = a_user("Payments", Permission.TICKETS_READ)


def test_has_at_least_fifty_tickets_with_unique_ids_and_keys() -> None:
    assert len(TICKETS) >= 50
    assert len({t.id for t in TICKETS}) == len(TICKETS)
    assert len({t.key for t in TICKETS}) == len(TICKETS)


def test_covers_every_state_and_severity() -> None:
    assert {t.state for t in TICKETS} == set(TicketState)
    assert {t.severity for t in TICKETS} == set(Severity)


def test_spreads_tickets_across_several_teams() -> None:
    teams = {t.assigned_team for t in TICKETS}

    assert len(teams) >= 3
    assert "Payments" in teams
    assert "Security Champions" in {t.creator_team for t in TICKETS}


def test_has_restricted_tickets_hidden_from_another_team() -> None:
    hidden = [t for t in TICKETS if not t.is_visible_to(DEVELOPER)]

    assert hidden
    assert all(t.restricted for t in hidden)


def test_has_expired_and_non_expired_open_tickets() -> None:
    today = NOW.date()
    open_tickets = [t for t in TICKETS if t.state is not TicketState.DONE]

    assert any(t.is_expired(today) for t in open_tickets)
    assert any(not t.is_expired(today) for t in open_tickets)


def test_has_tickets_with_unknown_asset() -> None:
    assert any(t.asset == "None" for t in TICKETS)


def test_includes_the_statement_example_ticket() -> None:
    example = next(t for t in TICKETS if t.key == "SEC-1024")

    assert example.id == UUID("b7c1e0de-6f0a-4f43-9a55-0a2f6c1d8e11")
    assert example.title == "Log4j vulnerable version in payments-api"


def test_is_deterministic() -> None:
    assert build_seed_tickets(NOW) == TICKETS


@pytest.mark.parametrize("days_later", [0, 365, 3650])
def test_dates_are_relative_to_now_so_every_run_has_expired_and_valid_tickets(
    days_later: int,
) -> None:
    now = NOW + timedelta(days=days_later)
    open_tickets = [t for t in build_seed_tickets(now) if t.state is not TicketState.DONE]

    assert any(t.is_expired(now.date()) for t in open_tickets)
    assert any(not t.is_expired(now.date()) for t in open_tickets)


@pytest.mark.parametrize("ticket", TICKETS, ids=lambda t: t.key)
def test_every_ticket_is_consistent(ticket: Ticket) -> None:
    assert re.fullmatch(r"[A-Z][A-Z0-9]{1,9}-[0-9]{1,6}", ticket.key)
    assert len(ticket.title) <= 200
    assert ticket.created_at <= ticket.last_modified <= NOW
    assert ticket.created_at.tzinfo is UTC
    # Setting a due date moves a ticket out of REPORTED, so REPORTED tickets never have one.
    if ticket.state is TicketState.REPORTED:
        assert ticket.due_date is None
