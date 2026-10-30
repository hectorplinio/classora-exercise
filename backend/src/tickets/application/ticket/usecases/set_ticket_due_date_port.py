from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import date
from uuid import UUID

from tickets.domain.ticket.model import Ticket
from tickets.domain.user.model import User


@dataclass(frozen=True, slots=True)
class SetTicketDueDateRequest:
    user: User
    ticket_id: UUID
    due_date: date


@dataclass(frozen=True, slots=True)
class SetTicketDueDateResponse:
    ticket: Ticket


class SetTicketDueDateUseCaseInterface(ABC):
    """Sets the due date of a ticket.

    Checks, in order: permission, visibility, ticket not DONE, due date not before today.
    """

    @abstractmethod
    def execute(self, request: SetTicketDueDateRequest) -> SetTicketDueDateResponse:
        raise NotImplementedError
