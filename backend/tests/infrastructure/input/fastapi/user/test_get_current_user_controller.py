from tests.utils.api import TEAM_LEAD, api_client


def test_returns_the_team_and_permissions_from_the_headers() -> None:
    response = api_client().get("/api/v1/me", headers=TEAM_LEAD)

    assert response.status_code == 200
    assert response.json() == {
        "team": "Payments",
        "permissions": ["tickets.read", "tickets.update"],
    }


def test_ignores_unknown_permissions_and_surrounding_spaces() -> None:
    headers = {"X-User-Team": " Payments ", "X-User-Permissions": " tickets.read , admin.all,"}

    response = api_client().get("/api/v1/me", headers=headers)

    assert response.json() == {"team": "Payments", "permissions": ["tickets.read"]}


def test_without_permissions_header_has_no_permissions() -> None:
    response = api_client().get("/api/v1/me", headers={"X-User-Team": "Payments"})

    assert response.json() == {"team": "Payments", "permissions": []}


def test_without_team_is_unauthorized_with_problem_details() -> None:
    response = api_client().get("/api/v1/me", headers={"X-User-Permissions": "tickets.read"})

    assert response.status_code == 401
    assert response.headers["content-type"] == "application/problem+json"
    assert response.json() == {
        "type": "about:blank",
        "title": "Unauthorized",
        "status": 401,
        "detail": "The X-User-Team header is required.",
    }
