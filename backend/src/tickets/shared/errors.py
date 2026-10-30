"""Application errors. Every error lives here: reuse these classes or add a new one.

The class says what kind of failure happened; the message says what exactly. The HTTP
mapping lives in the FastAPI input adapter. Wrap low-level exceptions with
`raise ... from e` instead of leaking them.
"""


class MiniTicketsError(Exception):
    """Base class for every expected error of the application."""

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


class DomainError(MiniTicketsError):
    """A business rule was violated."""


class EntityNotFoundError(DomainError):
    """The entity does not exist, or the user is not allowed to know it exists."""


class EntityConflictError(DomainError):
    """The operation conflicts with the current state of the entity."""


class UnprocessableEntityError(DomainError):
    """A well-formed request breaks a business rule.

    `details` maps each offending field to the reason it was rejected.
    """

    def __init__(self, message: str, details: dict[str, str] | None = None) -> None:
        super().__init__(message)
        self.details = details or {}


class AuthorizationError(MiniTicketsError):
    """The user lacks the permission the operation requires."""


class AuthenticationError(MiniTicketsError):
    """The caller could not be identified."""
