import logging
from dataclasses import replace
from uuid import uuid4

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from tests.utils.api import DEVELOPER, api_client, build_dependencies
from tests.utils.builders import a_ticket
from tickets.application.ticket.usecases.get_ticket_port import (
    GetTicketRequest,
    GetTicketResponse,
    GetTicketUseCaseInterface,
)
from tickets.infrastructure.input.fastapi.app import create_rest_app
from tickets.infrastructure.input.fastapi.shared.handle_controller_error import (
    handle_controller_error,
)
from tickets.shared.errors import DomainError, UnprocessableEntityError


class _ExplodingGetTicket(GetTicketUseCaseInterface):
    def execute(self, request: GetTicketRequest) -> GetTicketResponse:
        raise RuntimeError("database password is hunter2")


def test_unexpected_error_is_a_generic_500_without_internal_details() -> None:
    ticket = a_ticket()
    dependencies = replace(build_dependencies(ticket), get_ticket=_ExplodingGetTicket())
    client = TestClient(create_rest_app(dependencies), raise_server_exceptions=False)

    response = client.get(f"/api/v1/tickets/{ticket.id}", headers=DEVELOPER)

    assert response.status_code == 500
    assert response.headers["content-type"] == "application/problem+json"
    assert response.json()["detail"] == "An unexpected error occurred."
    assert "hunter2" not in response.text


def test_unexpected_error_outside_a_controller_is_also_a_generic_500() -> None:
    """Controllers catch their own errors; the global handler is the safety net for the rest
    (dependencies, middleware), simulated here with a route that raises."""
    app = create_rest_app(build_dependencies())
    assert isinstance(app, FastAPI)

    @app.get("/boom")
    def boom() -> None:
        raise RuntimeError("database password is hunter2")

    response = TestClient(app, raise_server_exceptions=False).get("/boom")

    assert response.status_code == 500
    assert response.headers["content-type"] == "application/problem+json"
    assert "hunter2" not in response.text


def test_unknown_route_is_a_problem_details_404() -> None:
    response = api_client().get("/api/v1/unknown", headers=DEVELOPER)

    assert response.status_code == 404
    assert response.headers["content-type"] == "application/problem+json"


def test_unprocessable_details_become_invalid_params_with_api_names() -> None:
    error = UnprocessableEntityError("Bad date.", details={"due_date": "Must be today or later."})

    response = handle_controller_error(error, logging.getLogger("test"))

    assert response.status_code == 422
    assert (
        b'"invalidParams":[{"name":"dueDate","reason":"Must be today or later."}]' in response.body
    )


@pytest.mark.parametrize("error", [DomainError("x"), ValueError("x")])
def test_errors_without_a_mapping_are_500(error: Exception) -> None:
    response = handle_controller_error(error, logging.getLogger("test"))

    assert response.status_code == 500


def test_openapi_does_not_expose_fastapi_validation_schemas() -> None:
    schemas = api_client().get("/openapi.json").json()["components"]["schemas"]

    assert "HTTPValidationError" not in schemas
    assert "ValidationError" not in schemas


def test_method_not_allowed_keeps_the_allow_header() -> None:
    response = api_client().request("TRACE", "/api/v1/me", headers=DEVELOPER)

    assert response.status_code == 405
    assert response.headers["allow"] == "GET"
    assert response.headers["content-type"] == "application/problem+json"


@pytest.mark.parametrize("body", [b"\xa2s", b"{not json"], ids=["not-utf8", "invalid-json"])
def test_unparseable_body_is_unprocessable_like_any_malformed_body(body: bytes) -> None:
    ticket = a_ticket()
    headers = {
        "X-User-Team": "Payments",
        "X-User-Permissions": "tickets.read,tickets.update",
        "Content-Type": "application/json",
    }

    response = api_client(ticket).patch(
        f"/api/v1/tickets/{ticket.id}", content=body, headers=headers
    )

    assert response.status_code == 422
    assert response.headers["content-type"] == "application/problem+json"
    assert [param["name"] for param in response.json()["invalidParams"]] == ["body"]


def test_allow_header_lists_every_method_of_the_path() -> None:
    response = api_client().request("OPTIONS", f"/api/v1/tickets/{uuid4()}", headers=DEVELOPER)

    assert response.status_code == 405
    assert response.headers["allow"] == "GET, PATCH"
