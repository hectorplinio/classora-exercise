from abc import ABC, abstractmethod
from uuid import UUID

from tickets.domain.ticket.model import Ticket


class TicketRepositoryInterface(ABC):
    """Stores tickets. Knows nothing about visibility or search: the use cases apply those rules."""

    @abstractmethod
    def get_by_id(self, ticket_id: UUID) -> Ticket | None:
        raise NotImplementedError

    @abstractmethod
    def list_all(self) -> list[Ticket]:
        raise NotImplementedError

    @abstractmethod
    def save(self, ticket: Ticket) -> None:
        raise NotImplementedError
