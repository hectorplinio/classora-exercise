from fastapi import APIRouter

from tickets.infrastructure.input.fastapi.shared.problem import problem_responses
from tickets.infrastructure.input.fastapi.ticket.dtos import TicketPageResponse, TicketResponse
from tickets.infrastructure.input.fastapi.ticket.get_ticket_controller import get_ticket_controller
from tickets.infrastructure.input.fastapi.ticket.search_tickets_controller import (
    search_tickets_controller,
)
from tickets.infrastructure.input.fastapi.ticket.set_ticket_due_date_controller import (
    set_ticket_due_date_controller,
)

router = APIRouter(prefix="/tickets")

router.add_api_route(
    "",
    search_tickets_controller,
    methods=["GET"],
    operation_id="searchTickets",
    tags=["Tickets"],
    summary="Search tickets",
    response_model=TicketPageResponse,
    responses=problem_responses(401, 403, 422),
)

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

router.add_api_route(
    "/{id}",
    set_ticket_due_date_controller,
    methods=["PATCH"],
    operation_id="setTicketDueDate",
    tags=["Tickets"],
    summary="Set the due date of a ticket",
    response_model=TicketResponse,
    responses=problem_responses(401, 403, 404, 409, 422),
)
