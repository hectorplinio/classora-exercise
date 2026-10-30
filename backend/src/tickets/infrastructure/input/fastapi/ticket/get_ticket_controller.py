import logging
from uuid import UUID

from fastapi.responses import JSONResponse

from tickets.application.ticket.usecases.get_ticket_port import GetTicketRequest
from tickets.infrastructure.input.fastapi.shared.current_user import CurrentUserInj
from tickets.infrastructure.input.fastapi.shared.dependencies import ClockInj, GetTicketUseCaseInj
from tickets.infrastructure.input.fastapi.shared.handle_controller_error import (
    handle_controller_error,
)
from tickets.infrastructure.input.fastapi.ticket.dtos import TicketResponse

logger = logging.getLogger(__name__)


def get_ticket_controller(
    id: UUID,
    user: CurrentUserInj,
    usecase: GetTicketUseCaseInj,
    clock: ClockInj,
) -> TicketResponse | JSONResponse:
    try:
        response = usecase.execute(GetTicketRequest(user=user, ticket_id=id))
        return TicketResponse.from_domain(response.ticket, today=clock.now().date())
    except Exception as e:
        return handle_controller_error(e, logger)
