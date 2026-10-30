import re
from datetime import date, datetime
from enum import StrEnum
from typing import Annotated, TypeVar
from uuid import UUID

from pydantic import AfterValidator, BeforeValidator, ConfigDict, Field

from tickets.application.ticket.usecases.search_tickets_port import SortDirection, TicketSortField
from tickets.domain.ticket.model import Severity, Ticket, TicketState
from tickets.infrastructure.input.fastapi.shared.dto import ApiModel
from tickets.infrastructure.input.fastapi.shared.pagination import PageResponse

_ISO_DATE = re.compile(r"\d{4}-\d{2}-\d{2}")
_EnumT = TypeVar("_EnumT", bound=StrEnum)


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


class TicketPageResponse(PageResponse[TicketResponse]):
    pass


def _iso_date_only(value: object) -> object:
    """Only `YYYY-MM-DD`: Pydantic would also accept timestamps and date-times as dates."""
    if not isinstance(value, str) or not _ISO_DATE.fullmatch(value):
        raise ValueError("Input should be a date in YYYY-MM-DD format")
    return value


class SetDueDateBody(ApiModel):
    model_config = ConfigDict(extra="forbid")

    due_date: Annotated[date, BeforeValidator(_iso_date_only)]


def _unique(values: list[_EnumT]) -> list[_EnumT]:
    if len(set(values)) != len(values):
        raise ValueError("Values must be unique")
    return values


class SearchTicketsQuery(ApiModel):
    """Query parameters of GET /tickets, with the limits of the contract."""

    offset: int = Field(default=0, ge=0, le=100_000)
    limit: int = Field(default=20, ge=1, le=100)
    q: str = Field(default="", max_length=256)
    state: Annotated[list[TicketState], AfterValidator(_unique)] = Field(
        default_factory=lambda: list(TicketState), min_length=1, max_length=4
    )
    severity: Annotated[list[Severity], AfterValidator(_unique)] = Field(
        default_factory=lambda: list(Severity), min_length=1, max_length=4
    )
    assigned_team: str = Field(default="", max_length=100)
    expired_only: bool = False
    sort: TicketSortField = TicketSortField.LAST_MODIFIED
    direction: SortDirection = SortDirection.DESC
