from collections.abc import Iterable
from threading import Lock
from uuid import UUID

from tickets.application.ticket.repository_port import TicketRepositoryInterface
from tickets.domain.ticket.model import Ticket


class InMemoryTicketRepository(TicketRepositoryInterface):
    """Process-local storage. The lock guards the dict: FastAPI runs sync endpoints in threads."""

    def __init__(self, tickets: Iterable[Ticket]) -> None:
        self._tickets = {ticket.id: ticket for ticket in tickets}
        self._lock = Lock()

    def get_by_id(self, ticket_id: UUID) -> Ticket | None:
        with self._lock:
            return self._tickets.get(ticket_id)

    def list_all(self) -> list[Ticket]:
        with self._lock:
            return list(self._tickets.values())

    def save(self, ticket: Ticket) -> None:
        with self._lock:
            self._tickets[ticket.id] = ticket
