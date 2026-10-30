"""Problem Details (RFC 9457): the body of every error response, as declared in the contract."""

from collections.abc import Mapping
from http import HTTPStatus
from typing import Any

from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from pydantic.json_schema import SkipJsonSchema

PROBLEM_MEDIA_TYPE = "application/problem+json"

# RFC 9110 reason phrases. Not taken from http.HTTPStatus: its 422 phrase depends on the Python
# version ("Unprocessable Entity" in 3.11, "Unprocessable Content" from 3.13).
_TITLES = {
    401: "Unauthorized",
    403: "Forbidden",
    404: "Not Found",
    405: "Method Not Allowed",
    409: "Conflict",
    422: "Unprocessable Content",
    500: "Internal Server Error",
}


def _title(status: int) -> str:
    return _TITLES.get(status) or HTTPStatus(status).phrase


class InvalidParam(BaseModel):
    name: str = Field(description="Name of the parameter or dotted path of the body field.")
    reason: str = Field(description="Why the value was rejected.")


class Problem(BaseModel):
    # Optional members are omitted when empty, never null: SkipJsonSchema keeps None out of the
    # documented schema, as the contract declares them optional but not nullable.
    type: str
    title: str
    status: int
    detail: str | SkipJsonSchema[None] = None
    instance: str | SkipJsonSchema[None] = None
    invalid_params: list[InvalidParam] | SkipJsonSchema[None] = Field(
        default=None, alias="invalidParams"
    )


def problem_response(
    status: int,
    detail: str,
    invalid_params: list[InvalidParam] | None = None,
    headers: Mapping[str, str] | None = None,
) -> JSONResponse:
    problem = Problem(
        type="about:blank",
        title=_title(status),
        status=status,
        detail=detail,
        invalidParams=invalid_params,
    )
    return JSONResponse(
        status_code=status,
        content=problem.model_dump(by_alias=True, exclude_none=True),
        media_type=PROBLEM_MEDIA_TYPE,
        headers=headers,
    )


def problem_responses(*statuses: int) -> dict[int | str, dict[str, Any]]:
    """OpenAPI documentation of the error responses a route can return.

    Declaring 422 here also stops FastAPI from adding its own `HTTPValidationError` schema. No
    `model=`: FastAPI would document it under application/json; the schema is registered in
    components by `generated_openapi`.
    """
    return {
        status: {
            "description": _title(status),
            "content": {PROBLEM_MEDIA_TYPE: {"schema": {"$ref": "#/components/schemas/Problem"}}},
        }
        for status in statuses
    }


def problem_schemas() -> dict[str, Any]:
    """`Problem` and the schemas it references, ready to add to `components/schemas`."""
    schema = Problem.model_json_schema(ref_template="#/components/schemas/{model}")
    return {**schema.pop("$defs", {}), "Problem": schema}
