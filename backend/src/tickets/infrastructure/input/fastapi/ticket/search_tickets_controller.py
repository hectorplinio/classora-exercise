import logging
from typing import Annotated

from fastapi import Query
from fastapi.responses import JSONResponse

from tickets.application.ticket.usecases.search_tickets_port import SearchTicketsRequest
from tickets.infrastructure.input.fastapi.shared.current_user import CurrentUserInj
from tickets.infrastructure.input.fastapi.shared.dependencies import (
    ClockInj,
    SearchTicketsUseCaseInj,
)
from tickets.infrastructure.input.fastapi.shared.handle_controller_error import (
    handle_controller_error,
)
from tickets.infrastructure.input.fastapi.ticket.dtos import (
    SearchTicketsQuery,
    TicketPageResponse,
    TicketResponse,
)

logger = logging.getLogger(__name__)


def search_tickets_controller(
    query: Annotated[SearchTicketsQuery, Query()],
    user: CurrentUserInj,
    usecase: SearchTicketsUseCaseInj,
    clock: ClockInj,
) -> TicketPageResponse | JSONResponse:
    try:
        page = usecase.execute(
            SearchTicketsRequest(
                user=user,
                offset=query.offset,
                limit=query.limit,
                q=query.q,
                states=frozenset(query.state),
                severities=frozenset(query.severity),
                assigned_team=query.assigned_team,
                expired_only=query.expired_only,
                sort=query.sort,
                direction=query.direction,
            )
        )
        today = clock.now().date()
        return TicketPageResponse.from_page(
            page,
            offset=query.offset,
            limit=query.limit,
            item=lambda ticket: TicketResponse.from_domain(ticket, today=today),
        )
    except Exception as e:
        return handle_controller_error(e, logger)
