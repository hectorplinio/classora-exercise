from tickets.application.ticket.repository_port import TicketRepositoryInterface
from tickets.application.ticket.usecases.get_ticket_port import (
    GetTicketRequest,
    GetTicketResponse,
    GetTicketUseCaseInterface,
)
from tickets.application.ticket.usecases.shared import get_visible_ticket
from tickets.domain.user.model import Permission


class GetTicketUseCase(GetTicketUseCaseInterface):
    def __init__(self, repository: TicketRepositoryInterface) -> None:
        self._repository = repository

    def execute(self, request: GetTicketRequest) -> GetTicketResponse:
        request.user.require(Permission.TICKETS_READ)
        ticket = get_visible_ticket(self._repository, request.ticket_id, request.user)
        return GetTicketResponse(ticket=ticket)
