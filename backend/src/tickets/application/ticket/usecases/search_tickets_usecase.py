from collections.abc import Callable
from datetime import date
from typing import Any

from tickets.application.shared.clock_port import ClockInterface
from tickets.application.ticket.repository_port import TicketRepositoryInterface
from tickets.application.ticket.usecases.search_tickets_port import (
    SearchTicketsRequest,
    SearchTicketsResponse,
    SearchTicketsUseCaseInterface,
    SortDirection,
    TicketSortField,
)
from tickets.domain.ticket.model import Severity, Ticket, TicketState
from tickets.domain.user.model import Permission

# Ascending means least to most severe, and lifecycle order for states.
_SEVERITY_RANK = {Severity.LOW: 0, Severity.MEDIUM: 1, Severity.HIGH: 2, Severity.CRITICAL: 3}
_STATE_RANK = {state: rank for rank, state in enumerate(TicketState)}


def _natural_key(ticket: Ticket) -> tuple[str, int, str]:
    """`SEC-999` before `SEC-1024`: compare the prefix, then the number by length and digits."""
    prefix, _, number = ticket.key.rpartition("-")
    return prefix, len(number), number


_SORT_KEYS: dict[TicketSortField, Callable[[Ticket], Any]] = {
    TicketSortField.KEY: _natural_key,
    TicketSortField.SEVERITY: lambda ticket: _SEVERITY_RANK[ticket.severity],
    TicketSortField.STATE: lambda ticket: _STATE_RANK[ticket.state],
    TicketSortField.TARGET_DATE: lambda ticket: ticket.target_date,
    TicketSortField.LAST_MODIFIED: lambda ticket: ticket.last_modified,
}


class SearchTicketsUseCase(SearchTicketsUseCaseInterface):
    def __init__(self, repository: TicketRepositoryInterface, clock: ClockInterface) -> None:
        self._repository = repository
        self._clock = clock

    def execute(self, request: SearchTicketsRequest) -> SearchTicketsResponse:
        request.user.require(Permission.TICKETS_READ)
        today = self._clock.now().date()

        # Visibility first, so hidden tickets are never returned nor counted.
        matching = [
            ticket
            for ticket in self._repository.list_all()
            if ticket.is_visible_to(request.user) and self._matches(ticket, request, today)
        ]
        # sort() is stable, also with reverse=True: sorting by id first makes id the tie-breaker.
        ordered = sorted(
            sorted(matching, key=lambda ticket: ticket.id),
            key=_SORT_KEYS[request.sort],
            reverse=request.direction is SortDirection.DESC,
        )
        page = ordered[request.offset : request.offset + request.limit]
        return SearchTicketsResponse(tickets=page, total_elements=len(matching))

    @staticmethod
    def _matches(ticket: Ticket, request: SearchTicketsRequest, today: date) -> bool:
        text = request.q.strip().casefold()
        return (
            ticket.state in request.states
            and ticket.severity in request.severities
            and (not request.assigned_team or ticket.assigned_team == request.assigned_team)
            and (not request.expired_only or ticket.is_expired(today))
            and (
                not text
                or any(
                    text in field.casefold() for field in (ticket.key, ticket.title, ticket.asset)
                )
            )
        )
