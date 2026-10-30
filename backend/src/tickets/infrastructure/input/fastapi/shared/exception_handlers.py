"""Errors raised before a controller runs (request validation, identity headers, unknown routes).

Controllers handle their own errors with `handle_controller_error`; these handlers give the
requests that never reach a controller the same Problem Details format.
"""

import logging
import re
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException

from tickets.infrastructure.input.fastapi.shared.handle_controller_error import (
    handle_controller_error,
)
from tickets.infrastructure.input.fastapi.shared.problem import InvalidParam, problem_response
from tickets.shared.errors import MiniTicketsError

logger = logging.getLogger(__name__)


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(RequestValidationError, _validation_error)
    app.add_exception_handler(MiniTicketsError, _application_error)
    app.add_exception_handler(HTTPException, _http_error)
    app.add_exception_handler(Exception, _unexpected_error)


async def _validation_error(_: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, RequestValidationError)
    invalid_params = [
        InvalidParam(name=_param_name(error), reason=error["msg"]) for error in exc.errors()
    ]
    return problem_response(422, "The request has invalid parameters.", invalid_params)


def _param_name(error: Any) -> str:
    # loc is ("query", "limit"), ("path", "id"), ("body", "dueDate"), or ("body",) if empty.
    # Invalid JSON gives ("body", <character position>): the whole body is the culprit.
    location, *path = error["loc"]
    if error["type"] == "json_invalid" or not path:
        return str(location)
    return ".".join(str(part) for part in path)


async def _application_error(_: Request, exc: Exception) -> JSONResponse:
    return handle_controller_error(exc, logger)


async def _http_error(request: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, HTTPException)
    if exc.status_code == 400:
        # FastAPI raises 400 when the body cannot even be decoded. The contract treats every
        # malformed body as 422, so it is reported like any other invalid body.
        body = InvalidParam(name="body", reason=str(exc.detail))
        return problem_response(422, "The request has invalid parameters.", [body])
    if exc.status_code == 405:
        return problem_response(405, str(exc.detail), headers={"Allow": _allowed_methods(request)})
    return problem_response(exc.status_code, str(exc.detail), headers=exc.headers)


def _allowed_methods(request: Request) -> str:
    """Every method of the path (RFC 9110). Starlette only lists the first matching route's, but
    GET and PATCH /tickets/{id} are two routes. The table is built by `create_rest_app`."""
    allowed: list[tuple[re.Pattern[str], str]] = request.app.state.allowed_methods
    return next((methods for path, methods in allowed if path.fullmatch(request.url.path)), "")


async def _unexpected_error(_: Request, exc: Exception) -> JSONResponse:
    return handle_controller_error(exc, logger)
