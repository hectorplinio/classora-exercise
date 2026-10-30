"""Composition root: the only place where adapters are wired to use cases.

Run with: uv run uvicorn tickets.main:create_app --factory --reload
"""

from tickets.infrastructure.input.fastapi.app import AsgiApp, create_rest_app


def create_app() -> AsgiApp:
    return create_rest_app()
