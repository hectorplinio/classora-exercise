from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import date
from enum import StrEnum

from tickets.application.shared.pagination import Page
from tickets.domain.ticket.model import Severity, Ticket, TicketState
from tickets.domain.user.model import User


class TicketSortField(StrEnum):
    KEY = "KEY"
    SEVERITY = "SEVERITY"
    STATE = "STATE"
    TARGET_DATE = "TARGET_DATE"
    LAST_MODIFIED = "LAST_MODIFIED"


class SortDirection(StrEnum):
    ASC = "ASC"
    DESC = "DESC"


@dataclass(frozen=True, slots=True)
class SearchTicketsRequest:
    user: User
    offset: int = 0
    limit: int = 20
    q: str = ""
    states: frozenset[TicketState] = frozenset(TicketState)
    severities: frozenset[Severity] = frozenset(Severity)
    assigned_team: str = ""
    expired_only: bool = False
    sort: TicketSortField = TicketSortField.LAST_MODIFIED
    direction: SortDirection = SortDirection.DESC


@dataclass(frozen=True, slots=True)
class SearchTicketsResponse(Page[Ticket]):
    # The day expiry was evaluated against: whoever presents the tickets must use the same one.
    today: date


class SearchTicketsUseCaseInterface(ABC):
    """Returns one page of the tickets visible to the user, filtered, searched and sorted."""

    @abstractmethod
    def execute(self, request: SearchTicketsRequest) -> SearchTicketsResponse:
        raise NotImplementedError
