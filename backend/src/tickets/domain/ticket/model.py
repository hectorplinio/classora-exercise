from dataclasses import dataclass, replace
from datetime import date, datetime
from enum import StrEnum
from typing import Self
from uuid import UUID

from tickets.domain.user.model import Permission, User
from tickets.shared.errors import EntityConflictError, UnprocessableEntityError


class TicketState(StrEnum):
    REPORTED = "REPORTED"
    IN_PROGRESS = "IN_PROGRESS"
    PENDING_SECURITY = "PENDING_SECURITY"
    DONE = "DONE"


class Severity(StrEnum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


@dataclass(frozen=True, slots=True)
class Ticket:
    """A security ticket. Immutable: operations return a new ticket."""

    id: UUID
    key: str
    title: str
    asset: str
    creator_team: str
    assigned_team: str
    assignee: str
    severity: Severity
    state: TicketState
    restricted: bool
    target_date: date
    due_date: date | None
    created_at: datetime
    last_modified: datetime

    def is_visible_to(self, user: User) -> bool:
        return (
            not self.restricted
            or user.team in (self.creator_team, self.assigned_team)
            or user.has(Permission.TICKETS_READ_ALL)
        )

    def is_expired(self, today: date) -> bool:
        return self.state is not TicketState.DONE and self.target_date < today

    def set_due_date(self, due_date: date, *, today: date, now: datetime) -> Self:
        if self.state is TicketState.DONE:
            raise EntityConflictError(f"Ticket {self.key} is already DONE.")
        if due_date < today:
            raise UnprocessableEntityError(
                "The due date cannot be before today.",
                details={"due_date": f"Must be {today.isoformat()} or later."},
            )
        state = TicketState.IN_PROGRESS if self.state is TicketState.REPORTED else self.state
        return replace(self, due_date=due_date, state=state, last_modified=now)
