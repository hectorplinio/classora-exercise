from datetime import timedelta

import pytest

from tests.utils.builders import NOW, TODAY, a_ticket, a_user
from tickets.domain.ticket.model import TicketState
from tickets.domain.user.model import Permission
from tickets.shared.errors import EntityConflictError, UnprocessableEntityError


class TestVisibility:
    def test_non_restricted_ticket_is_visible_to_any_team(self) -> None:
        ticket = a_ticket(
            restricted=False, creator_team="Security Champions", assigned_team="Payments"
        )

        assert ticket.is_visible_to(a_user("Identity"))

    def test_restricted_ticket_is_visible_to_its_creator_team(self) -> None:
        ticket = a_ticket(
            restricted=True, creator_team="Security Champions", assigned_team="Payments"
        )

        assert ticket.is_visible_to(a_user("Security Champions"))

    def test_restricted_ticket_is_visible_to_its_assigned_team(self) -> None:
        ticket = a_ticket(
            restricted=True, creator_team="Security Champions", assigned_team="Payments"
        )

        assert ticket.is_visible_to(a_user("Payments"))

    def test_restricted_ticket_is_hidden_from_other_teams(self) -> None:
        ticket = a_ticket(
            restricted=True, creator_team="Security Champions", assigned_team="Payments"
        )

        assert not ticket.is_visible_to(a_user("Identity", Permission.TICKETS_READ))

    def test_restricted_ticket_is_visible_to_other_teams_with_read_all(self) -> None:
        ticket = a_ticket(
            restricted=True, creator_team="Security Champions", assigned_team="Payments"
        )

        assert ticket.is_visible_to(a_user("Identity", Permission.TICKETS_READ_ALL))


class TestExpiry:
    def test_ticket_whose_target_date_is_before_today_is_expired(self) -> None:
        ticket = a_ticket(state=TicketState.IN_PROGRESS, target_date=TODAY - timedelta(days=1))

        assert ticket.is_expired(TODAY)

    def test_ticket_whose_target_date_is_today_is_not_expired(self) -> None:
        ticket = a_ticket(state=TicketState.IN_PROGRESS, target_date=TODAY)

        assert not ticket.is_expired(TODAY)

    def test_ticket_whose_target_date_is_in_the_future_is_not_expired(self) -> None:
        ticket = a_ticket(state=TicketState.IN_PROGRESS, target_date=TODAY + timedelta(days=1))

        assert not ticket.is_expired(TODAY)

    def test_done_ticket_is_never_expired(self) -> None:
        ticket = a_ticket(state=TicketState.DONE, target_date=TODAY - timedelta(days=30))

        assert not ticket.is_expired(TODAY)


class TestSetDueDate:
    def test_sets_the_due_date_and_last_modified(self) -> None:
        ticket = a_ticket(state=TicketState.IN_PROGRESS, due_date=None)
        due_date = TODAY + timedelta(days=10)

        updated = ticket.set_due_date(due_date, today=TODAY, now=NOW)

        assert updated.due_date == due_date
        assert updated.last_modified == NOW

    def test_reported_ticket_moves_to_in_progress(self) -> None:
        ticket = a_ticket(state=TicketState.REPORTED)

        updated = ticket.set_due_date(TODAY, today=TODAY, now=NOW)

        assert updated.state is TicketState.IN_PROGRESS

    @pytest.mark.parametrize("state", [TicketState.IN_PROGRESS, TicketState.PENDING_SECURITY])
    def test_other_open_states_are_kept(self, state: TicketState) -> None:
        ticket = a_ticket(state=state)

        updated = ticket.set_due_date(TODAY, today=TODAY, now=NOW)

        assert updated.state is state

    def test_due_date_today_is_accepted(self) -> None:
        updated = a_ticket().set_due_date(TODAY, today=TODAY, now=NOW)

        assert updated.due_date == TODAY

    def test_due_date_before_today_is_rejected(self) -> None:
        with pytest.raises(UnprocessableEntityError) as error:
            a_ticket().set_due_date(TODAY - timedelta(days=1), today=TODAY, now=NOW)

        assert error.value.details == {"due_date": "Must be 2026-10-30 or later."}

    def test_done_ticket_is_rejected(self) -> None:
        with pytest.raises(EntityConflictError, match="SEC-1024 is already DONE"):
            a_ticket(state=TicketState.DONE).set_due_date(TODAY, today=TODAY, now=NOW)

    def test_done_is_checked_before_the_date(self) -> None:
        ticket = a_ticket(state=TicketState.DONE)

        with pytest.raises(EntityConflictError, match="SEC-1024 is already DONE"):
            ticket.set_due_date(TODAY - timedelta(days=1), today=TODAY, now=NOW)

    def test_original_ticket_is_not_modified(self) -> None:
        ticket = a_ticket(state=TicketState.REPORTED, due_date=None)

        ticket.set_due_date(TODAY, today=TODAY, now=NOW)

        assert ticket.state is TicketState.REPORTED
        assert ticket.due_date is None
