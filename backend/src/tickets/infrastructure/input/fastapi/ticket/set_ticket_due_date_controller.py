import logging
from uuid import UUID

from fastapi.responses import JSONResponse

from tickets.application.ticket.usecases.set_ticket_due_date_port import SetTicketDueDateRequest
from tickets.infrastructure.input.fastapi.shared.current_user import CurrentUserInj
from tickets.infrastructure.input.fastapi.shared.dependencies import (
    ClockInj,
    SetTicketDueDateUseCaseInj,
)
from tickets.infrastructure.input.fastapi.shared.handle_controller_error import (
    handle_controller_error,
)
from tickets.infrastructure.input.fastapi.ticket.dtos import SetDueDateBody, TicketResponse

logger = logging.getLogger(__name__)


def set_ticket_due_date_controller(
    id: UUID,
    body: SetDueDateBody,
    user: CurrentUserInj,
    usecase: SetTicketDueDateUseCaseInj,
    clock: ClockInj,
) -> TicketResponse | JSONResponse:
    try:
        response = usecase.execute(
            SetTicketDueDateRequest(user=user, ticket_id=id, due_date=body.due_date)
        )
        return TicketResponse.from_domain(response.ticket, today=clock.now().date())
    except Exception as e:
        return handle_controller_error(e, logger)
