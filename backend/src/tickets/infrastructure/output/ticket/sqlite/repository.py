import sqlite3
from collections.abc import Iterable
from datetime import date, datetime
from pathlib import Path
from threading import Lock
from typing import Any
from uuid import UUID

from tickets.application.ticket.repository_port import TicketRepositoryInterface
from tickets.domain.ticket.model import Severity, Ticket, TicketState

_SCHEMA = """
CREATE TABLE IF NOT EXISTS tickets (
    id            TEXT PRIMARY KEY,
    key           TEXT NOT NULL UNIQUE,
    title         TEXT NOT NULL,
    asset         TEXT NOT NULL,
    creator_team  TEXT NOT NULL,
    assigned_team TEXT NOT NULL,
    assignee      TEXT NOT NULL,
    severity      TEXT NOT NULL,
    state         TEXT NOT NULL,
    restricted    INTEGER NOT NULL,
    target_date   TEXT NOT NULL,
    due_date      TEXT,
    created_at    TEXT NOT NULL,
    last_modified TEXT NOT NULL
)
"""

_COLUMNS = (
    "id, key, title, asset, creator_team, assigned_team, assignee, severity, state, restricted, "
    "target_date, due_date, created_at, last_modified"
)
_UPSERT = f"""
INSERT INTO tickets ({_COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
ON CONFLICT (id) DO UPDATE SET
    key = excluded.key, title = excluded.title, asset = excluded.asset,
    creator_team = excluded.creator_team, assigned_team = excluded.assigned_team,
    assignee = excluded.assignee, severity = excluded.severity, state = excluded.state,
    restricted = excluded.restricted, target_date = excluded.target_date,
    due_date = excluded.due_date, created_at = excluded.created_at,
    last_modified = excluded.last_modified
"""


class SqliteTicketRepository(TicketRepositoryInterface):
    """Tickets in a SQLite file, so changes survive restarts (standard library only).

    One connection guarded by a lock: FastAPI runs sync endpoints in threads. Visibility, search
    and sorting stay in the use cases, exactly as with the in-memory repository: this adapter
    only stores and loads tickets.
    """

    def __init__(self, path: Path | str) -> None:
        # Autocommit mode: each statement commits on its own; `seed_if_empty` opens its own
        # transaction.
        self._connection = sqlite3.connect(path, check_same_thread=False, isolation_level=None)
        self._lock = Lock()
        with self._lock:
            self._connection.execute(_SCHEMA)

    def get_by_id(self, ticket_id: UUID) -> Ticket | None:
        with self._lock:
            row = self._connection.execute(
                f"SELECT {_COLUMNS} FROM tickets WHERE id = ?", (str(ticket_id),)
            ).fetchone()
        return _to_ticket(row) if row else None

    def list_all(self) -> list[Ticket]:
        with self._lock:
            rows = self._connection.execute(f"SELECT {_COLUMNS} FROM tickets").fetchall()
        return [_to_ticket(row) for row in rows]

    def save(self, ticket: Ticket) -> None:
        with self._lock:
            self._connection.execute(_UPSERT, _to_row(ticket))

    def seed_if_empty(self, tickets: Iterable[Ticket]) -> bool:
        """Stores `tickets` only if there are none yet; returns whether it did. The check and the
        inserts are one write transaction, so two processes starting at once seed only once."""
        with self._lock:
            self._connection.execute("BEGIN IMMEDIATE")
            try:
                if self._connection.execute("SELECT 1 FROM tickets LIMIT 1").fetchone():
                    self._connection.execute("ROLLBACK")
                    return False
                self._connection.executemany(_UPSERT, [_to_row(ticket) for ticket in tickets])
                self._connection.execute("COMMIT")
                return True
            except BaseException:
                self._connection.execute("ROLLBACK")
                raise

    def close(self) -> None:
        with self._lock:
            self._connection.close()


def _to_row(ticket: Ticket) -> tuple[Any, ...]:
    return (
        str(ticket.id),
        ticket.key,
        ticket.title,
        ticket.asset,
        ticket.creator_team,
        ticket.assigned_team,
        ticket.assignee,
        ticket.severity.value,
        ticket.state.value,
        int(ticket.restricted),
        ticket.target_date.isoformat(),
        ticket.due_date.isoformat() if ticket.due_date else None,
        ticket.created_at.isoformat(),
        ticket.last_modified.isoformat(),
    )


def _to_ticket(row: tuple[Any, ...]) -> Ticket:
    (
        id_,
        key,
        title,
        asset,
        creator_team,
        assigned_team,
        assignee,
        severity,
        state,
        restricted,
        target_date,
        due_date,
        created_at,
        last_modified,
    ) = row
    return Ticket(
        id=UUID(id_),
        key=key,
        title=title,
        asset=asset,
        creator_team=creator_team,
        assigned_team=assigned_team,
        assignee=assignee,
        severity=Severity(severity),
        state=TicketState(state),
        restricted=bool(restricted),
        target_date=date.fromisoformat(target_date),
        due_date=date.fromisoformat(due_date) if due_date else None,
        created_at=datetime.fromisoformat(created_at),
        last_modified=datetime.fromisoformat(last_modified),
    )
