"""The spec FastAPI generates from the routes and DTOs must not contradict the contract.

Each test compares one aspect for every operation; a failure names the operation and shows both
sides, normalized (see tests/utils/openapi.py for what is compared and why).
"""

from typing import Any

import pytest

from tests.utils.api import build_dependencies
from tests.utils.openapi import Document, normalize, operations, parameters, resolve
from tickets.infrastructure.input.fastapi.app import create_rest_app, generated_openapi
from tickets.main import load_contract

CONTRACT: Document = load_contract()
GENERATED: Document = generated_openapi(create_rest_app(build_dependencies()))
OPERATIONS = sorted(operations(CONTRACT))


def _pair(key: tuple[str, str]) -> tuple[dict[str, Any], dict[str, Any]]:
    return operations(CONTRACT)[key], operations(GENERATED)[key]


def test_paths_and_methods_match() -> None:
    assert sorted(operations(GENERATED)) == OPERATIONS


@pytest.mark.parametrize("key", OPERATIONS, ids=lambda key: f"{key[1].upper()} {key[0]}")
class TestOperation:
    def test_operation_id_and_tags(self, key: tuple[str, str]) -> None:
        contract, generated = _pair(key)

        assert generated["operationId"] == contract["operationId"]
        assert generated["tags"] == contract["tags"]

    def test_parameters(self, key: tuple[str, str]) -> None:
        contract, generated = _pair(key)
        path = key[0]

        assert parameters(generated, GENERATED["paths"][path], GENERATED) == parameters(
            contract, CONTRACT["paths"][path], CONTRACT
        )

    def test_request_body(self, key: tuple[str, str]) -> None:
        contract, generated = _pair(key)

        def body(operation: dict[str, Any], document: Document) -> Any:
            if "requestBody" not in operation:
                return None
            request_body = resolve(operation["requestBody"], document)
            return {
                "required": request_body.get("required", False),
                "content": {
                    media: normalize(content["schema"], document)
                    for media, content in request_body["content"].items()
                },
            }

        assert body(generated, GENERATED) == body(contract, CONTRACT)

    def test_response_codes_and_media_types(self, key: tuple[str, str]) -> None:
        contract, generated = _pair(key)

        def media_types(operation: dict[str, Any], document: Document) -> dict[str, list[str]]:
            return {
                code: sorted(resolve(response, document).get("content", {}))
                for code, response in operation["responses"].items()
            }

        assert media_types(generated, GENERATED) == media_types(contract, CONTRACT)

    def test_response_schemas(self, key: tuple[str, str]) -> None:
        contract, generated = _pair(key)

        def schemas(operation: dict[str, Any], document: Document) -> dict[str, Any]:
            result = {}
            for code, raw in operation["responses"].items():
                for media, content in resolve(raw, document).get("content", {}).items():
                    result[f"{code} {media}"] = normalize(content["schema"], document)
            return result

        assert schemas(generated, GENERATED) == schemas(contract, CONTRACT)


def test_the_served_document_is_the_contract() -> None:
    from fastapi.testclient import TestClient

    from tickets.main import create_app

    served = TestClient(create_app()).get("/openapi.json").json()

    assert served == {**CONTRACT, "servers": [{"url": "/", "description": "This server"}]}
