from datetime import UTC, datetime, timedelta

from tickets.infrastructure.output.clock.system_clock import SystemClock


def test_returns_the_current_time_in_utc() -> None:
    before = datetime.now(UTC)

    now = SystemClock().now()

    assert now.tzinfo is UTC
    assert before <= now <= before + timedelta(seconds=5)
