"""Composition root: the only place where adapters are wired to use cases.

Run with: uv run uvicorn tickets.main:create_app --factory --reload
The repository lives in memory: run a single worker (each process would have its own copy).
"""

import os
from pathlib import Path
from typing import Any

import yaml

from tickets.application.ticket.usecases.get_ticket_usecase import GetTicketUseCase
from tickets.application.ticket.usecases.search_tickets_usecase import SearchTicketsUseCase
from tickets.application.ticket.usecases.set_ticket_due_date_usecase import (
    SetTicketDueDateUseCase,
)
from tickets.infrastructure.input.fastapi.app import AsgiApp, create_rest_app
from tickets.infrastructure.input.fastapi.shared.dependencies import Dependencies
from tickets.infrastructure.output.clock.system_clock import SystemClock
from tickets.infrastructure.output.ticket.in_memory.repository import InMemoryTicketRepository
from tickets.infrastructure.output.ticket.seed import build_seed_tickets

# backend/src/tickets/main.py → repository root. Override with MINI_TICKETS_CONTRACT (e.g. Docker).
_DEFAULT_CONTRACT = Path(__file__).resolve().parents[3] / "contract" / "openapi-rest.yml"


def load_contract() -> dict[str, Any]:
    path = Path(os.environ.get("MINI_TICKETS_CONTRACT", _DEFAULT_CONTRACT))
    with path.open(encoding="utf-8") as contract:
        document: dict[str, Any] = yaml.safe_load(contract)
    return document


def create_app() -> AsgiApp:
    clock = SystemClock()
    repository = InMemoryTicketRepository(build_seed_tickets(clock.now()))
    return create_rest_app(
        Dependencies(
            clock=clock,
            search_tickets=SearchTicketsUseCase(repository, clock),
            get_ticket=GetTicketUseCase(repository),
            set_ticket_due_date=SetTicketDueDateUseCase(repository, clock),
        ),
        openapi_document=load_contract(),
    )
