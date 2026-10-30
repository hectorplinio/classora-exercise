from abc import ABC, abstractmethod
from dataclasses import dataclass
from uuid import UUID

from tickets.domain.ticket.model import Ticket
from tickets.domain.user.model import User


@dataclass(frozen=True, slots=True)
class GetTicketRequest:
    user: User
    ticket_id: UUID


@dataclass(frozen=True, slots=True)
class GetTicketResponse:
    ticket: Ticket


class GetTicketUseCaseInterface(ABC):
    """Returns a ticket visible to the user. Missing and not visible are the same: not found."""

    @abstractmethod
    def execute(self, request: GetTicketRequest) -> GetTicketResponse:
        raise NotImplementedError
