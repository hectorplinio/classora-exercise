from tickets.infrastructure.input.fastapi.shared.current_user import CurrentUserInj
from tickets.infrastructure.input.fastapi.user.dtos import CurrentUserResponse


def get_current_user_controller(user: CurrentUserInj) -> CurrentUserResponse:
    # No use case: the identity is resolved by the CurrentUserInj dependency; this only maps it.
    return CurrentUserResponse.from_domain(user)
