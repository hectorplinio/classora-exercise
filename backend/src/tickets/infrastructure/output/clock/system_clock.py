from datetime import UTC, datetime

from tickets.application.shared.clock_port import ClockInterface


class SystemClock(ClockInterface):
    """The only place in the code base that reads the system time."""

    def now(self) -> datetime:
        return datetime.now(UTC)
