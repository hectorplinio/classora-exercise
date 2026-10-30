from uuid import uuid4

import pytest

from tests.utils.builders import a_ticket, a_user
from tests.utils.doubles import FakeTicketRepository
from tickets.application.ticket.usecases.get_ticket_port import GetTicketRequest
from tickets.application.ticket.usecases.get_ticket_usecase import GetTicketUseCase
from tickets.domain.user.model import Permission
from tickets.shared.errors import AuthorizationError, EntityNotFoundError

READER = a_user("Payments", Permission.TICKETS_READ)


def test_returns_a_visible_ticket() -> None:
    ticket = a_ticket()
    usecase = GetTicketUseCase(FakeTicketRepository(ticket))

    response = usecase.execute(GetTicketRequest(user=READER, ticket_id=ticket.id))

    assert response.ticket == ticket


def test_missing_ticket_is_not_found() -> None:
    usecase = GetTicketUseCase(FakeTicketRepository())

    with pytest.raises(EntityNotFoundError):
        usecase.execute(GetTicketRequest(user=READER, ticket_id=uuid4()))


def test_ticket_not_visible_is_not_found_with_the_same_message() -> None:
    ticket = a_ticket(restricted=True, creator_team="Identity", assigned_team="Identity")
    usecase = GetTicketUseCase(FakeTicketRepository(ticket))

    with pytest.raises(EntityNotFoundError, match=f"^Ticket {ticket.id} not found.$"):
        usecase.execute(GetTicketRequest(user=READER, ticket_id=ticket.id))


def test_requires_the_read_permission() -> None:
    ticket = a_ticket()
    usecase = GetTicketUseCase(FakeTicketRepository(ticket))

    with pytest.raises(AuthorizationError):
        usecase.execute(GetTicketRequest(user=a_user("Payments"), ticket_id=ticket.id))
