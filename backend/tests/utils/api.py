"""Helpers for API tests: the real FastAPI adapter and use cases over test doubles."""

from datetime import datetime

from fastapi.testclient import TestClient

from tests.utils.builders import NOW
from tests.utils.doubles import FakeTicketRepository, FixedClock
from tickets.application.ticket.usecases.get_ticket_usecase import GetTicketUseCase
from tickets.application.ticket.usecases.search_tickets_usecase import SearchTicketsUseCase
from tickets.application.ticket.usecases.set_ticket_due_date_usecase import (
    SetTicketDueDateUseCase,
)
from tickets.domain.ticket.model import Ticket
from tickets.infrastructure.input.fastapi.app import create_rest_app
from tickets.infrastructure.input.fastapi.shared.dependencies import Dependencies

# The three profiles of the statement.
DEVELOPER = {"X-User-Team": "Payments", "X-User-Permissions": "tickets.read"}
TEAM_LEAD = {"X-User-Team": "Payments", "X-User-Permissions": "tickets.read,tickets.update"}
SECURITY = {
    "X-User-Team": "Security Champions",
    "X-User-Permissions": "tickets.read,tickets.update,tickets.read.all",
}


def build_dependencies(*tickets: Ticket, now: datetime = NOW) -> Dependencies:
    repository = FakeTicketRepository(*tickets)
    clock = FixedClock(now)
    return Dependencies(
        clock=clock,
        search_tickets=SearchTicketsUseCase(repository, clock),
        get_ticket=GetTicketUseCase(repository),
        set_ticket_due_date=SetTicketDueDateUseCase(repository, clock),
    )


def api_client(*tickets: Ticket, now: datetime = NOW) -> TestClient:
    return TestClient(create_rest_app(build_dependencies(*tickets, now=now)))
