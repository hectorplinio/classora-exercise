from datetime import date, datetime
from uuid import UUID

from tickets.domain.ticket.model import Severity, Ticket, TicketState
from tickets.infrastructure.input.fastapi.shared.dto import ApiModel


class TicketResponse(ApiModel):
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
    expired: bool
    created_at: datetime
    last_modified: datetime

    @classmethod
    def from_domain(cls, ticket: Ticket, *, today: date) -> "TicketResponse":
        return cls(
            id=ticket.id,
            key=ticket.key,
            title=ticket.title,
            asset=ticket.asset,
            creator_team=ticket.creator_team,
            assigned_team=ticket.assigned_team,
            assignee=ticket.assignee,
            severity=ticket.severity,
            state=ticket.state,
            restricted=ticket.restricted,
            target_date=ticket.target_date,
            due_date=ticket.due_date,
            expired=ticket.is_expired(today),
            created_at=ticket.created_at,
            last_modified=ticket.last_modified,
        )
