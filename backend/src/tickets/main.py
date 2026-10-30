"""Composition root: the only place where adapters are wired to use cases.

Run with: uv run uvicorn tickets.main:create_app --factory --reload
The repository lives in memory: run a single worker (each process would have its own copy).
"""

from tickets.application.ticket.usecases.get_ticket_usecase import GetTicketUseCase
from tickets.application.ticket.usecases.search_tickets_usecase import SearchTicketsUseCase
from tickets.application.ticket.usecases.set_ticket_due_date_usecase import (
    SetTicketDueDateUseCase,
)
from tickets.infrastructure.input.fastapi.app import AsgiApp, create_rest_app
from tickets.infrastructure.input.fastapi.shared.dependencies import Dependencies
from tickets.infrastructure.output.clock.system_clock import SystemClock
from tickets.infrastructure.output.ticket.in_memory.repository import InMemoryTicketRepository
from tickets.infrastructure.output.ticket.in_memory.seed import build_seed_tickets


def create_app() -> AsgiApp:
    clock = SystemClock()
    repository = InMemoryTicketRepository(build_seed_tickets(clock.now()))
    return create_rest_app(
        Dependencies(
            clock=clock,
            search_tickets=SearchTicketsUseCase(repository, clock),
            get_ticket=GetTicketUseCase(repository),
            set_ticket_due_date=SetTicketDueDateUseCase(repository, clock),
        )
    )
