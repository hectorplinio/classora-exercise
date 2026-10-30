from fastapi import APIRouter

from tickets.infrastructure.input.fastapi.shared.problem import problem_responses
from tickets.infrastructure.input.fastapi.ticket.dtos import TicketResponse
from tickets.infrastructure.input.fastapi.ticket.get_ticket_controller import get_ticket_controller

router = APIRouter(prefix="/tickets")

router.add_api_route(
    "/{id}",
    get_ticket_controller,
    methods=["GET"],
    operation_id="getTicket",
    tags=["Tickets"],
    summary="Get a ticket",
    response_model=TicketResponse,
    responses=problem_responses(401, 403, 404, 422),
)
