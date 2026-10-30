"""Every list endpoint answers with the same shape: `{data, pagination}`."""

from collections.abc import Callable
from typing import Generic, Self, TypeVar

from tickets.application.shared.pagination import Page
from tickets.infrastructure.input.fastapi.shared.dto import ApiModel

T = TypeVar("T")
ItemT = TypeVar("ItemT")


class PaginationResponse(ApiModel):
    offset: int
    limit: int
    total_elements: int


class PageResponse(ApiModel, Generic[ItemT]):
    data: list[ItemT]
    pagination: PaginationResponse

    @classmethod
    def from_page(
        cls, page: Page[T], *, offset: int, limit: int, item: Callable[[T], ItemT]
    ) -> Self:
        return cls(
            data=[item(element) for element in page.items],
            pagination=PaginationResponse(
                offset=offset, limit=limit, total_elements=page.total_elements
            ),
        )
