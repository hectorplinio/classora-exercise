from tickets.application.shared.clock_port import ClockInterface
from tickets.application.ticket.repository_port import TicketRepositoryInterface
from tickets.application.ticket.usecases.set_ticket_due_date_port import (
    SetTicketDueDateRequest,
    SetTicketDueDateResponse,
    SetTicketDueDateUseCaseInterface,
)
from tickets.application.ticket.usecases.shared import get_visible_ticket
from tickets.domain.user.model import Permission


class SetTicketDueDateUseCase(SetTicketDueDateUseCaseInterface):
    def __init__(self, repository: TicketRepositoryInterface, clock: ClockInterface) -> None:
        self._repository = repository
        self._clock = clock

    def execute(self, request: SetTicketDueDateRequest) -> SetTicketDueDateResponse:
        # Order matters (403 → 404 → 409 → 422): see the operation description in the contract.
        request.user.require(Permission.TICKETS_READ)
        request.user.require(Permission.TICKETS_UPDATE)
        ticket = get_visible_ticket(self._repository, request.ticket_id, request.user)

        now = self._clock.now()
        updated = ticket.set_due_date(request.due_date, today=now.date(), now=now)
        self._repository.save(updated)
        return SetTicketDueDateResponse(ticket=updated)
