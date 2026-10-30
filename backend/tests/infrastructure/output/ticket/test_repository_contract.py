"""The contract of TicketRepositoryInterface, run against every implementation: the use cases
must not notice which one they get."""

from collections.abc import Callable, Iterator
from dataclasses import replace
from pathlib import Path
from uuid import uuid4

import pytest

from tests.utils.builders import a_ticket
from tickets.application.ticket.repository_port import TicketRepositoryInterface
from tickets.domain.ticket.model import Ticket, TicketState
from tickets.infrastructure.output.ticket.in_memory.repository import InMemoryTicketRepository
from tickets.infrastructure.output.ticket.sqlite.repository import SqliteTicketRepository

RepositoryFactory = Callable[[list[Ticket]], TicketRepositoryInterface]


@pytest.fixture(params=["in_memory", "sqlite"])
def make_repository(request: pytest.FixtureRequest, tmp_path: Path) -> Iterator[RepositoryFactory]:
    opened: list[SqliteTicketRepository] = []

    def make(tickets: list[Ticket]) -> TicketRepositoryInterface:
        if request.param == "in_memory":
            return InMemoryTicketRepository(tickets)
        repository = SqliteTicketRepository(tmp_path / f"tickets-{len(opened)}.db")
        repository.seed_if_empty(tickets)
        opened.append(repository)
        return repository

    yield make
    for repository in opened:
        repository.close()


def test_gets_a_stored_ticket_by_id(make_repository: RepositoryFactory) -> None:
    ticket = a_ticket()

    assert make_repository([ticket]).get_by_id(ticket.id) == ticket


def test_missing_ticket_is_none(make_repository: RepositoryFactory) -> None:
    assert make_repository([]).get_by_id(uuid4()) is None


def test_lists_every_ticket(make_repository: RepositoryFactory) -> None:
    tickets = [a_ticket(key="SEC-1"), a_ticket(key="SEC-2")]

    assert sorted(t.key for t in make_repository(tickets).list_all()) == ["SEC-1", "SEC-2"]


def test_save_replaces_the_stored_ticket(make_repository: RepositoryFactory) -> None:
    ticket = a_ticket(state=TicketState.REPORTED)
    repository = make_repository([ticket])
    updated = replace(ticket, state=TicketState.IN_PROGRESS)

    repository.save(updated)

    assert repository.get_by_id(ticket.id) == updated
    assert len(repository.list_all()) == 1


def test_save_adds_a_new_ticket(make_repository: RepositoryFactory) -> None:
    repository = make_repository([])
    ticket = a_ticket()

    repository.save(ticket)

    assert repository.list_all() == [ticket]


def test_list_all_returns_a_copy(make_repository: RepositoryFactory) -> None:
    repository = make_repository([a_ticket()])

    repository.list_all().clear()

    assert len(repository.list_all()) == 1
