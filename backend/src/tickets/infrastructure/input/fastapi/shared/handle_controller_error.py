import logging

from fastapi.responses import JSONResponse
from pydantic.alias_generators import to_camel

from tickets.infrastructure.input.fastapi.shared.problem import InvalidParam, problem_response
from tickets.shared.errors import (
    AuthenticationError,
    AuthorizationError,
    EntityConflictError,
    EntityNotFoundError,
    MiniTicketsError,
    UnprocessableEntityError,
)

HTTP_STATUS_CODE_BY_ERROR: dict[type[MiniTicketsError], int] = {
    EntityNotFoundError: 404,
    EntityConflictError: 409,
    UnprocessableEntityError: 422,
    AuthorizationError: 403,
    AuthenticationError: 401,
}


def handle_controller_error(exc: Exception, logger: logging.Logger) -> JSONResponse:
    """Maps an error to a Problem Details response. Internal details only go to the logs.

    Errors without an entry (including a bare `DomainError`) are bugs, not client errors: 500.
    """
    if not isinstance(exc, MiniTicketsError) or type(exc) not in HTTP_STATUS_CODE_BY_ERROR:
        logger.exception("Unhandled error", exc_info=exc)
        return problem_response(500, "An unexpected error occurred.")

    status = HTTP_STATUS_CODE_BY_ERROR[type(exc)]
    logger.warning("Handled error: %s", exc, exc_info=exc.__cause__)
    invalid_params = None
    if isinstance(exc, UnprocessableEntityError) and exc.details:
        # Domain field names (due_date) are translated to API names (dueDate).
        invalid_params = [
            InvalidParam(name=to_camel(field), reason=reason)
            for field, reason in exc.details.items()
        ]
    return problem_response(status, exc.message, invalid_params)
