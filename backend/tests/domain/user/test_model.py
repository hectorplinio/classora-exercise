import pytest

from tests.utils.builders import a_user
from tickets.domain.user.model import Permission
from tickets.shared.errors import AuthorizationError


def test_user_has_the_permissions_it_was_given() -> None:
    user = a_user("Payments", Permission.TICKETS_READ)

    assert user.has(Permission.TICKETS_READ)
    assert not user.has(Permission.TICKETS_UPDATE)


def test_require_passes_when_the_user_has_the_permission() -> None:
    user = a_user("Payments", Permission.TICKETS_UPDATE)

    user.require(Permission.TICKETS_UPDATE)


def test_require_raises_authorization_error_when_the_permission_is_missing() -> None:
    user = a_user("Payments", Permission.TICKETS_READ)

    with pytest.raises(AuthorizationError, match=r"tickets\.update permission is required"):
        user.require(Permission.TICKETS_UPDATE)
