from collections.abc import Awaitable, Callable, MutableMapping
from typing import Any, Protocol

from fastapi import FastAPI

Scope = MutableMapping[str, Any]
Message = MutableMapping[str, Any]
Receive = Callable[[], Awaitable[Message]]
Send = Callable[[Message], Awaitable[None]]


class AsgiApp(Protocol):
    """Any ASGI application, whatever the framework: all the server and main.py need."""

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None: ...


def create_rest_app() -> AsgiApp:
    return FastAPI(title="Mini Tickets API", version="1.0.0")
