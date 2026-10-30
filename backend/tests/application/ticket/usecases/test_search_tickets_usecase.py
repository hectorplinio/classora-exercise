from datetime import UTC, datetime, timedelta
from uuid import UUID

import pytest

from tests.utils.builders import NOW, TODAY, a_ticket, a_user
from tests.utils.doubles import FakeTicketRepository, FixedClock
from tickets.application.ticket.usecases.search_tickets_port import (
    SearchTicketsRequest,
    SortDirection,
    TicketSortField,
)
from tickets.application.ticket.usecases.search_tickets_usecase import SearchTicketsUseCase
from tickets.domain.ticket.model import Severity, Ticket, TicketState
from tickets.domain.user.model import Permission, User
from tickets.shared.errors import AuthorizationError

READER = a_user("Payments", Permission.TICKETS_READ)


def search(tickets: list[Ticket], user: User = READER, **params: object) -> tuple[list[str], int]:
    """Runs the use case and returns the keys of the page and the total."""
    usecase = SearchTicketsUseCase(FakeTicketRepository(*tickets), FixedClock(NOW))

    response = usecase.execute(SearchTicketsRequest(user=user, **params))  # type: ignore[arg-type]

    return [ticket.key for ticket in response.items], response.total_elements


def test_requires_the_read_permission() -> None:
    usecase = SearchTicketsUseCase(FakeTicketRepository(), FixedClock(NOW))

    with pytest.raises(AuthorizationError):
        usecase.execute(SearchTicketsRequest(user=a_user("Payments")))


class TestVisibility:
    def test_hidden_tickets_are_neither_returned_nor_counted(self) -> None:
        tickets = [
            a_ticket(key="SEC-1", restricted=False, assigned_team="Identity"),
            a_ticket(key="SEC-2", restricted=True, assigned_team="Payments"),
            a_ticket(
                key="SEC-3", restricted=True, assigned_team="Identity", creator_team="Identity"
            ),
        ]

        keys, total = search(tickets, sort=TicketSortField.KEY, direction=SortDirection.ASC)

        assert keys == ["SEC-1", "SEC-2"]
        assert total == 2

    def test_read_all_sees_every_ticket(self) -> None:
        tickets = [a_ticket(restricted=True, assigned_team="Identity", creator_team="Identity")]
        user = a_user("Payments", Permission.TICKETS_READ, Permission.TICKETS_READ_ALL)

        _, total = search(tickets, user=user)

        assert total == 1


class TestFilters:
    def test_text_search_is_case_insensitive_over_key_title_and_asset(self) -> None:
        tickets = [
            a_ticket(key="SEC-1", title="Log4j in payments-api", asset="payments-api"),
            a_ticket(key="SEC-2", title="Weak TLS", asset="LOG4J-gateway"),
            a_ticket(key="LOG-3", title="Weak TLS", asset="None"),
            a_ticket(key="SEC-4", title="Weak TLS", asset="checkout"),
        ]

        keys, total = search(
            tickets, q="log", sort=TicketSortField.KEY, direction=SortDirection.ASC
        )

        assert keys == ["LOG-3", "SEC-1", "SEC-2"]
        assert total == 3

    def test_filters_by_states(self) -> None:
        tickets = [
            a_ticket(key="SEC-1", state=TicketState.REPORTED),
            a_ticket(key="SEC-2", state=TicketState.IN_PROGRESS),
            a_ticket(key="SEC-3", state=TicketState.DONE),
        ]

        keys, _ = search(
            tickets,
            states=frozenset({TicketState.REPORTED, TicketState.DONE}),
            sort=TicketSortField.KEY,
            direction=SortDirection.ASC,
        )

        assert keys == ["SEC-1", "SEC-3"]

    def test_filters_by_severities(self) -> None:
        tickets = [
            a_ticket(key="SEC-1", severity=Severity.CRITICAL),
            a_ticket(key="SEC-2", severity=Severity.LOW),
        ]

        keys, _ = search(tickets, severities=frozenset({Severity.CRITICAL}))

        assert keys == ["SEC-1"]

    def test_filters_by_assigned_team(self) -> None:
        tickets = [
            a_ticket(key="SEC-1", assigned_team="Payments"),
            a_ticket(key="SEC-2", assigned_team="Identity"),
        ]

        keys, _ = search(tickets, assigned_team="Identity")

        assert keys == ["SEC-2"]

    def test_expired_only_uses_the_clock_date(self) -> None:
        tickets = [
            a_ticket(
                key="SEC-1", state=TicketState.IN_PROGRESS, target_date=TODAY - timedelta(days=1)
            ),
            a_ticket(key="SEC-2", state=TicketState.IN_PROGRESS, target_date=TODAY),
            a_ticket(key="SEC-3", state=TicketState.DONE, target_date=TODAY - timedelta(days=1)),
        ]

        keys, total = search(tickets, expired_only=True)

        assert keys == ["SEC-1"]
        assert total == 1


class TestSorting:
    def test_default_order_is_last_modified_descending(self) -> None:
        tickets = [
            a_ticket(key="SEC-1", last_modified=datetime(2026, 10, 1, tzinfo=UTC)),
            a_ticket(key="SEC-2", last_modified=datetime(2026, 10, 3, tzinfo=UTC)),
            a_ticket(key="SEC-3", last_modified=datetime(2026, 10, 2, tzinfo=UTC)),
        ]

        keys, _ = search(tickets)

        assert keys == ["SEC-2", "SEC-3", "SEC-1"]

    def test_key_is_sorted_naturally(self) -> None:
        tickets = [a_ticket(key="SEC-1024"), a_ticket(key="SEC-999"), a_ticket(key="APP-5")]

        keys, _ = search(tickets, sort=TicketSortField.KEY, direction=SortDirection.ASC)

        assert keys == ["APP-5", "SEC-999", "SEC-1024"]

    def test_severity_ascending_goes_from_least_to_most_severe(self) -> None:
        tickets = [
            a_ticket(key="SEC-1", severity=Severity.HIGH),
            a_ticket(key="SEC-2", severity=Severity.LOW),
            a_ticket(key="SEC-3", severity=Severity.CRITICAL),
            a_ticket(key="SEC-4", severity=Severity.MEDIUM),
        ]

        keys, _ = search(tickets, sort=TicketSortField.SEVERITY, direction=SortDirection.ASC)

        assert keys == ["SEC-2", "SEC-4", "SEC-1", "SEC-3"]

    def test_state_follows_the_lifecycle(self) -> None:
        tickets = [
            a_ticket(key="SEC-1", state=TicketState.DONE),
            a_ticket(key="SEC-2", state=TicketState.REPORTED),
            a_ticket(key="SEC-3", state=TicketState.PENDING_SECURITY),
            a_ticket(key="SEC-4", state=TicketState.IN_PROGRESS),
        ]

        keys, _ = search(tickets, sort=TicketSortField.STATE, direction=SortDirection.ASC)

        assert keys == ["SEC-2", "SEC-4", "SEC-3", "SEC-1"]

    def test_target_date_descending(self) -> None:
        tickets = [
            a_ticket(key="SEC-1", target_date=TODAY),
            a_ticket(key="SEC-2", target_date=TODAY + timedelta(days=5)),
        ]

        keys, _ = search(tickets, sort=TicketSortField.TARGET_DATE, direction=SortDirection.DESC)

        assert keys == ["SEC-2", "SEC-1"]

    @pytest.mark.parametrize("direction", list(SortDirection))
    def test_ties_are_broken_by_id_so_pages_never_overlap(self, direction: SortDirection) -> None:
        ids = [UUID(int=n) for n in (5, 3, 9, 1, 7)]
        tickets = [a_ticket(id=ticket_id, key=f"SEC-{ticket_id.int}") for ticket_id in ids]

        pages = [
            search(
                tickets, offset=offset, limit=2, sort=TicketSortField.SEVERITY, direction=direction
            )[0]
            for offset in (0, 2, 4)
        ]

        assert pages == [["SEC-1", "SEC-3"], ["SEC-5", "SEC-7"], ["SEC-9"]]


class TestPagination:
    def test_returns_the_requested_page_and_the_total(self) -> None:
        tickets = [a_ticket(key=f"SEC-{n}") for n in range(1, 6)]

        keys, total = search(
            tickets, offset=1, limit=2, sort=TicketSortField.KEY, direction=SortDirection.ASC
        )

        assert keys == ["SEC-2", "SEC-3"]
        assert total == 5

    def test_offset_past_the_end_returns_an_empty_page(self) -> None:
        keys, total = search([a_ticket()], offset=10)

        assert keys == []
        assert total == 1
