"""Test doubles: simple working implementations of the application ports."""

from datetime import datetime
from uuid import UUID

from tickets.application.shared.clock_port import ClockInterface
from tickets.application.ticket.repository_port import TicketRepositoryInterface
from tickets.domain.ticket.model import Ticket


class FakeTicketRepository(TicketRepositoryInterface):
    def __init__(self, *tickets: Ticket) -> None:
        self._tickets = {ticket.id: ticket for ticket in tickets}

    def get_by_id(self, ticket_id: UUID) -> Ticket | None:
        return self._tickets.get(ticket_id)

    def list_all(self) -> list[Ticket]:
        return list(self._tickets.values())

    def save(self, ticket: Ticket) -> None:
        self._tickets[ticket.id] = ticket


class FixedClock(ClockInterface):
    def __init__(self, now: datetime) -> None:
        self._now = now

    def now(self) -> datetime:
        return self._now


class TickingClock(ClockInterface):
    """Returns the given instants one per call (the last one forever): time passing mid-request."""

    def __init__(self, *instants: datetime) -> None:
        self._instants = list(instants)

    def now(self) -> datetime:
        return self._instants.pop(0) if len(self._instants) > 1 else self._instants[0]
