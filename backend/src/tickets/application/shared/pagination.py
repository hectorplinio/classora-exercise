from dataclasses import dataclass
from typing import Generic, TypeVar

T = TypeVar("T")


@dataclass(frozen=True, slots=True)
class Page(Generic[T]):
    """One page of a list use case: the items in the page and the total matching the criteria."""

    items: list[T]
    total_elements: int
