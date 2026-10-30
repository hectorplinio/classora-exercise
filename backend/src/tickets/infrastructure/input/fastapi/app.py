from collections.abc import Awaitable, Callable, MutableMapping
from typing import Any, Protocol

from fastapi import FastAPI

from tickets.infrastructure.input.fastapi.shared.dependencies import Dependencies
from tickets.infrastructure.input.fastapi.shared.exception_handlers import (
    register_exception_handlers,
)
from tickets.infrastructure.input.fastapi.ticket.router import router as ticket_router
from tickets.infrastructure.input.fastapi.user.router import router as user_router

Scope = MutableMapping[str, Any]
Message = MutableMapping[str, Any]
Receive = Callable[[], Awaitable[Message]]
Send = Callable[[Message], Awaitable[None]]

API_PREFIX = "/api/v1"


class AsgiApp(Protocol):
    """Any ASGI application, whatever the framework: all the server and main.py need."""

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None: ...


def create_rest_app(dependencies: Dependencies) -> AsgiApp:
    app = FastAPI(title="Mini Tickets API", version="1.0.0")
    app.state.dependencies = dependencies
    register_exception_handlers(app)
    app.include_router(user_router, prefix=API_PREFIX)
    app.include_router(ticket_router, prefix=API_PREFIX)
    return app
