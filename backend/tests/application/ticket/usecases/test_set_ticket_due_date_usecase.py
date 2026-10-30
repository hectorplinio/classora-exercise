from datetime import timedelta
from uuid import uuid4

import pytest

from tests.utils.builders import NOW, TODAY, a_ticket, a_user
from tests.utils.doubles import FakeTicketRepository, FixedClock
from tickets.application.ticket.usecases.set_ticket_due_date_port import SetTicketDueDateRequest
from tickets.application.ticket.usecases.set_ticket_due_date_usecase import (
    SetTicketDueDateUseCase,
)
from tickets.domain.ticket.model import TicketState
from tickets.domain.user.model import Permission
from tickets.shared.errors import (
    AuthorizationError,
    EntityConflictError,
    EntityNotFoundError,
    UnprocessableEntityError,
)

TEAM_LEAD = a_user("Payments", Permission.TICKETS_READ, Permission.TICKETS_UPDATE)
DEVELOPER = a_user("Payments", Permission.TICKETS_READ)


def test_sets_the_due_date_and_saves_the_ticket() -> None:
    ticket = a_ticket(state=TicketState.REPORTED)
    repository = FakeTicketRepository(ticket)
    usecase = SetTicketDueDateUseCase(repository, FixedClock(NOW))
    due_date = TODAY + timedelta(days=7)

    response = usecase.execute(
        SetTicketDueDateRequest(user=TEAM_LEAD, ticket_id=ticket.id, due_date=due_date)
    )

    assert response.ticket.due_date == due_date
    assert response.ticket.state is TicketState.IN_PROGRESS
    assert response.ticket.last_modified == NOW
    assert repository.get_by_id(ticket.id) == response.ticket


def test_without_update_permission_is_forbidden() -> None:
    ticket = a_ticket()
    usecase = SetTicketDueDateUseCase(FakeTicketRepository(ticket), FixedClock(NOW))

    with pytest.raises(AuthorizationError):
        usecase.execute(
            SetTicketDueDateRequest(user=DEVELOPER, ticket_id=ticket.id, due_date=TODAY)
        )


def test_permission_is_checked_before_visibility() -> None:
    usecase = SetTicketDueDateUseCase(FakeTicketRepository(), FixedClock(NOW))

    with pytest.raises(AuthorizationError):
        usecase.execute(SetTicketDueDateRequest(user=DEVELOPER, ticket_id=uuid4(), due_date=TODAY))


def test_ticket_not_visible_is_not_found() -> None:
    ticket = a_ticket(restricted=True, creator_team="Identity", assigned_team="Identity")
    usecase = SetTicketDueDateUseCase(FakeTicketRepository(ticket), FixedClock(NOW))

    with pytest.raises(EntityNotFoundError):
        usecase.execute(
            SetTicketDueDateRequest(user=TEAM_LEAD, ticket_id=ticket.id, due_date=TODAY)
        )


def test_done_ticket_is_a_conflict_and_is_not_saved() -> None:
    ticket = a_ticket(state=TicketState.DONE)
    repository = FakeTicketRepository(ticket)
    usecase = SetTicketDueDateUseCase(repository, FixedClock(NOW))

    with pytest.raises(EntityConflictError):
        usecase.execute(
            SetTicketDueDateRequest(user=TEAM_LEAD, ticket_id=ticket.id, due_date=TODAY)
        )

    assert repository.get_by_id(ticket.id) == ticket


def test_due_date_before_today_is_unprocessable() -> None:
    ticket = a_ticket()
    usecase = SetTicketDueDateUseCase(FakeTicketRepository(ticket), FixedClock(NOW))

    with pytest.raises(UnprocessableEntityError):
        usecase.execute(
            SetTicketDueDateRequest(
                user=TEAM_LEAD, ticket_id=ticket.id, due_date=TODAY - timedelta(days=1)
            )
        )
