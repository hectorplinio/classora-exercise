"""Errors raised before a controller runs (request validation, identity headers, unknown routes).

Controllers handle their own errors with `handle_controller_error`; these handlers give the
requests that never reach a controller the same Problem Details format.
"""

import logging

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
        # loc is ("query", "limit"), ("path", "id"), ("body", "dueDate"), or ("body",) if empty.
        InvalidParam(
            name=".".join(str(part) for part in error["loc"][1:]) or str(error["loc"][0]),
            reason=error["msg"],
        )
        for error in exc.errors()
    ]
    return problem_response(422, "The request has invalid parameters.", invalid_params)


async def _application_error(_: Request, exc: Exception) -> JSONResponse:
    return handle_controller_error(exc, logger)


async def _http_error(_: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, HTTPException)
    return problem_response(exc.status_code, str(exc.detail))


async def _unexpected_error(_: Request, exc: Exception) -> JSONResponse:
    return handle_controller_error(exc, logger)
