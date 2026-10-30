from tickets.domain.user.model import User
from tickets.infrastructure.input.fastapi.shared.dto import ApiModel


class CurrentUserResponse(ApiModel):
    team: str
    permissions: list[str]

    @classmethod
    def from_domain(cls, user: User) -> "CurrentUserResponse":
        return cls(team=user.team, permissions=sorted(user.permissions))
