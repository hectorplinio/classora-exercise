"""Simulated identity: the caller is read from the X-User-Team and X-User-Permissions headers."""

from typing import Annotated

from fastapi import Depends, Request

from tickets.domain.user.model import Permission, User
from tickets.shared.errors import AuthenticationError

TEAM_HEADER = "X-User-Team"
PERMISSIONS_HEADER = "X-User-Permissions"
_KNOWN_PERMISSIONS = {permission.value: permission for permission in Permission}


def get_current_user(request: Request) -> User:
    """Raises 401 without a team. Unknown permissions are ignored, never trusted."""
    team = request.headers.get(TEAM_HEADER, "").strip()
    if not team:
        raise AuthenticationError(f"The {TEAM_HEADER} header is required.")
    raw_permissions = request.headers.get(PERMISSIONS_HEADER, "").split(",")
    permissions = frozenset(
        _KNOWN_PERMISSIONS[name]
        for name in map(str.strip, raw_permissions)
        if name in _KNOWN_PERMISSIONS
    )
    return User(team=team, permissions=permissions)


CurrentUserInj = Annotated[User, Depends(get_current_user)]
