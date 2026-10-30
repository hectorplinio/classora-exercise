from collections.abc import Iterator
from dataclasses import replace
from datetime import UTC, date, datetime, timedelta, timezone
from pathlib import Path

import pytest

from tests.utils.builders import a_ticket
from tickets.domain.ticket.model import Severity, Ticket, TicketState
from tickets.infrastructure.output.ticket.sqlite.repository import SqliteTicketRepository


@pytest.fixture
def database(tmp_path: Path) -> Path:
    return tmp_path / "tickets.db"


@pytest.fixture
def repository(database: Path) -> Iterator[SqliteTicketRepository]:
    repository = SqliteTicketRepository(database)
    yield repository
    repository.close()


def test_every_field_survives_a_round_trip(repository: SqliteTicketRepository) -> None:
    ticket = a_ticket(
        asset="None",
        severity=Severity.CRITICAL,
        state=TicketState.PENDING_SECURITY,
        restricted=True,
        target_date=date(2026, 1, 31),
        due_date=date(2026, 2, 1),
        created_at=datetime(2026, 1, 1, 8, 30, 15, 123456, tzinfo=UTC),
        last_modified=datetime(2026, 1, 2, 9, 0, tzinfo=timezone(timedelta(hours=2))),
    )

    repository.save(ticket)

    assert repository.get_by_id(ticket.id) == ticket


def test_changes_survive_reopening_the_file(
    repository: SqliteTicketRepository, database: Path
) -> None:
    ticket = a_ticket()
    repository.save(ticket)
    repository.save(replace(ticket, due_date=date(2099, 1, 15)))
    repository.close()

    reopened = SqliteTicketRepository(database)

    assert reopened.get_by_id(ticket.id) == replace(ticket, due_date=date(2099, 1, 15))
    reopened.close()


def test_seeds_only_an_empty_database(repository: SqliteTicketRepository) -> None:
    first, second = a_ticket(key="SEC-1"), a_ticket(key="SEC-2")

    assert repository.seed_if_empty([first]) is True
    assert repository.seed_if_empty([second]) is False
    assert repository.list_all() == [first]


def test_a_failed_seed_stores_nothing(repository: SqliteTicketRepository) -> None:
    def tickets() -> Iterator[Ticket]:
        yield a_ticket()
        raise RuntimeError("broken seed")

    with pytest.raises(RuntimeError, match="broken seed"):
        repository.seed_if_empty(tickets())

    assert repository.list_all() == []
    assert repository.seed_if_empty([a_ticket()]) is True
