# Postman

1. Start the backend: `cd backend && uv run uvicorn tickets.main:create_app --factory`.
2. Import `mini-tickets.postman_collection.json` and the four `*.postman_environment.json` files.
3. Pick an environment to choose the profile:

| Environment | `X-User-Team` | `X-User-Permissions` |
| --- | --- | --- |
| Developer | Payments | `tickets.read` |
| Team lead | Payments | `tickets.read,tickets.update` |
| Security | Security Champions | `tickets.read,tickets.update,tickets.read.all` |
| Anonymous | — | — (every request → 401) |

The collection pre-request script sends both headers and computes `{{today}}`, `{{tomorrow}}` and `{{yesterday}}` (UTC). Tickets come from the deterministic seed, so the ids in the requests are stable; with the default in-memory storage, changes are lost when the backend restarts (with SQLite or Docker they persist; see the main README).

Expected status codes per profile:

| Request | Developer | Team lead | Security | Anonymous |
| --- | --- | --- | --- | --- |
| Get current user | 200 | 200 | 200 | 401 |
| Search tickets (all variants) | 200 | 200 | 200 | 401 |
| Search with invalid parameters | 422 | 422 | 422 | 401 |
| Get ticket SEC-1024 / expired SEC-1105 | 200 | 200 | 200 | 401 |
| Get restricted ticket SEC-1107 | 404 | 404 | 200 | 401 |
| Get missing ticket | 404 | 404 | 404 | 401 |
| Get malformed id | 422 | 422 | 422 | 401 |
| Set due date SEC-1024 | 403 | 200 | 200 | 401 |
| Set due date on a DONE ticket | 403 | 409 | 409 | 401 |
| Set due date in the past | 403 | 422 | 422 | 401 |
| Set due date on restricted SEC-1128 | 403 | 404 | 200 | 401 |
| Set due date with a malformed body | 422 | 422 | 422 | 401 |

A malformed body is 422 even without permission: the body is validated before the handler runs (see the contract).
