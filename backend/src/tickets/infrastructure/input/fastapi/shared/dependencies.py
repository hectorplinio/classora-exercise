"""What controllers receive: `main.py` builds it, controllers ask for each piece with `Depends`."""

from dataclasses import dataclass
from typing import Annotated, cast

from fastapi import Depends, Request

from tickets.application.shared.clock_port import ClockInterface
from tickets.application.ticket.usecases.get_ticket_port import GetTicketUseCaseInterface
from tickets.application.ticket.usecases.search_tickets_port import SearchTicketsUseCaseInterface
from tickets.application.ticket.usecases.set_ticket_due_date_port import (
    SetTicketDueDateUseCaseInterface,
)


@dataclass(frozen=True, slots=True)
class Dependencies:
    clock: ClockInterface
    search_tickets: SearchTicketsUseCaseInterface
    get_ticket: GetTicketUseCaseInterface
    set_ticket_due_date: SetTicketDueDateUseCaseInterface


def _dependencies(request: Request) -> Dependencies:
    return cast(Dependencies, request.app.state.dependencies)


def _clock(request: Request) -> ClockInterface:
    return _dependencies(request).clock


def _get_ticket(request: Request) -> GetTicketUseCaseInterface:
    return _dependencies(request).get_ticket


ClockInj = Annotated[ClockInterface, Depends(_clock)]
GetTicketUseCaseInj = Annotated[GetTicketUseCaseInterface, Depends(_get_ticket)]
