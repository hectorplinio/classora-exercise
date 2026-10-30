from abc import ABC, abstractmethod
from datetime import datetime


class ClockInterface(ABC):
    """The only source of the current time. Implementations return timezone-aware UTC datetimes."""

    @abstractmethod
    def now(self) -> datetime:
        raise NotImplementedError
