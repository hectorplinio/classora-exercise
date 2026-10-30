from uuid import UUID

from tickets.application.ticket.repository_port import TicketRepositoryInterface
from tickets.domain.ticket.model import Ticket
from tickets.domain.user.model import User
from tickets.shared.errors import EntityNotFoundError


def get_visible_ticket(
    repository: TicketRepositoryInterface, ticket_id: UUID, user: User
) -> Ticket:
    """Missing and not visible raise the same error: a restricted ticket never leaks."""
    ticket = repository.get_by_id(ticket_id)
    if ticket is None or not ticket.is_visible_to(user):
        raise EntityNotFoundError(f"Ticket {ticket_id} not found.")
    return ticket
