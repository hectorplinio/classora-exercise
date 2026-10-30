from dataclasses import replace
from uuid import uuid4

from tests.utils.builders import a_ticket
from tickets.domain.ticket.model import TicketState
from tickets.infrastructure.output.ticket.in_memory.repository import InMemoryTicketRepository


def test_gets_a_stored_ticket_by_id() -> None:
    ticket = a_ticket()
    repository = InMemoryTicketRepository([ticket])

    assert repository.get_by_id(ticket.id) == ticket


def test_missing_ticket_is_none() -> None:
    assert InMemoryTicketRepository([]).get_by_id(uuid4()) is None


def test_lists_every_ticket() -> None:
    tickets = [a_ticket(key="SEC-1"), a_ticket(key="SEC-2")]

    assert sorted(t.key for t in InMemoryTicketRepository(tickets).list_all()) == ["SEC-1", "SEC-2"]


def test_save_replaces_the_stored_ticket() -> None:
    ticket = a_ticket(state=TicketState.REPORTED)
    repository = InMemoryTicketRepository([ticket])
    updated = replace(ticket, state=TicketState.IN_PROGRESS)

    repository.save(updated)

    assert repository.get_by_id(ticket.id) == updated
    assert len(repository.list_all()) == 1


def test_list_all_returns_a_copy() -> None:
    repository = InMemoryTicketRepository([a_ticket()])

    repository.list_all().clear()

    assert len(repository.list_all()) == 1
