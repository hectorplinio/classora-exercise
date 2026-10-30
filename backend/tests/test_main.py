from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from tests.utils.api import TEAM_LEAD
from tickets.infrastructure.output.clock.system_clock import SystemClock
from tickets.infrastructure.output.ticket.in_memory.repository import InMemoryTicketRepository
from tickets.infrastructure.output.ticket.sqlite.repository import SqliteTicketRepository
from tickets.main import create_app, create_ticket_repository

SEC_1024 = "b7c1e0de-6f0a-4f43-9a55-0a2f6c1d8e11"


def test_tickets_live_in_memory_by_default(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("MINI_TICKETS_DATABASE", raising=False)

    repository = create_ticket_repository(SystemClock())

    assert isinstance(repository, InMemoryTicketRepository)
    assert len(repository.list_all()) == 60


def test_a_database_file_is_seeded_on_the_first_start(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    monkeypatch.setenv("MINI_TICKETS_DATABASE", str(tmp_path / "tickets.db"))

    repository = create_ticket_repository(SystemClock())

    assert isinstance(repository, SqliteTicketRepository)
    assert len(repository.list_all()) == 60
    repository.close()


def test_with_a_database_changes_survive_a_restart(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    monkeypatch.setenv("MINI_TICKETS_DATABASE", str(tmp_path / "tickets.db"))
    body = {"dueDate": "2099-01-15"}

    first_run = TestClient(create_app()).patch(
        f"/api/v1/tickets/{SEC_1024}", json=body, headers=TEAM_LEAD
    )
    after_restart = TestClient(create_app()).get(f"/api/v1/tickets/{SEC_1024}", headers=TEAM_LEAD)

    assert first_run.status_code == 200
    assert after_restart.json()["dueDate"] == "2099-01-15"
    assert after_restart.json()["state"] == "IN_PROGRESS"
