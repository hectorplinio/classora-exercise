import re
from collections.abc import Awaitable, Callable, MutableMapping
from typing import Any, Protocol

from fastapi import FastAPI
from fastapi.openapi.utils import get_openapi

from tickets.infrastructure.input.fastapi.shared.dependencies import Dependencies
from tickets.infrastructure.input.fastapi.shared.exception_handlers import (
    register_exception_handlers,
)
from tickets.infrastructure.input.fastapi.shared.problem import problem_schemas
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


def create_rest_app(
    dependencies: Dependencies, openapi_document: dict[str, Any] | None = None
) -> AsgiApp:
    """Builds the app. With `openapi_document` (the contract), /openapi.json and /docs serve it
    instead of the spec FastAPI generates: clients see exactly what was agreed. That the routes
    match it is checked by the contract conformance tests.
    """
    app = FastAPI(title="Mini Tickets API", version="1.0.0")
    app.state.dependencies = dependencies
    register_exception_handlers(app)
    app.include_router(user_router, prefix=API_PREFIX)
    app.include_router(ticket_router, prefix=API_PREFIX)
    app.state.allowed_methods = _allowed_methods_by_path(generated_openapi(app))
    if openapi_document is None:
        app.openapi = lambda: generated_openapi(app)  # type: ignore[method-assign]
    else:
        # The contract lists the production HTTPS server; "Try it out" must hit this one.
        served = {**openapi_document, "servers": [{"url": "/", "description": "This server"}]}
        app.openapi = lambda: served  # type: ignore[method-assign]
    return app


_HTTP_METHODS = {"get", "put", "post", "patch", "delete"}


def _allowed_methods_by_path(document: dict[str, Any]) -> list[tuple[re.Pattern[str], str]]:
    """`/api/v1/tickets/{id}` → (regex for the path, "GET, PATCH"), for the `Allow` header."""
    return [
        (
            re.compile(re.sub(r"\{[^/}]+\}", "[^/]+", path)),
            ", ".join(sorted(method.upper() for method in item if method in _HTTP_METHODS)),
        )
        for path, item in document["paths"].items()
    ]


def generated_openapi(app: Any) -> dict[str, Any]:
    """The spec FastAPI derives from the routes and DTOs, compared with the contract in tests."""
    document = get_openapi(title=app.title, version=app.version, routes=app.routes)
    document.setdefault("components", {}).setdefault("schemas", {}).update(problem_schemas())
    return document
