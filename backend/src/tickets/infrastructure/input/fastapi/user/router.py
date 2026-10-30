from fastapi import APIRouter

from tickets.infrastructure.input.fastapi.shared.problem import problem_responses
from tickets.infrastructure.input.fastapi.user.dtos import CurrentUserResponse
from tickets.infrastructure.input.fastapi.user.get_current_user_controller import (
    get_current_user_controller,
)

router = APIRouter()

router.add_api_route(
    "/me",
    get_current_user_controller,
    methods=["GET"],
    operation_id="getCurrentUser",
    tags=["Users"],
    summary="Get the current user",
    response_model=CurrentUserResponse,
    responses=problem_responses(401),
)
