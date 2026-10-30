from dataclasses import dataclass
from enum import StrEnum

from tickets.shared.errors import AuthorizationError


class Permission(StrEnum):
    TICKETS_READ = "tickets.read"
    TICKETS_UPDATE = "tickets.update"
    TICKETS_READ_ALL = "tickets.read.all"


@dataclass(frozen=True, slots=True)
class User:
    team: str
    permissions: frozenset[Permission]

    def has(self, permission: Permission) -> bool:
        return permission in self.permissions

    def require(self, permission: Permission) -> None:
        if not self.has(permission):
            raise AuthorizationError(f"The {permission} permission is required.")
