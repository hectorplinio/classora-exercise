# Technical decisions

Short ADR-style notes. Each entry: context, decision, consequences.

## 1. Contract first, linted in CI

**Context.** The contract is the agreement between frontend and backend, and the statement lists ten requirements for it.

**Decision.** `contract/openapi-rest.yml` (OpenAPI 3.0.3) is written before any code and linted with Redocly CLI. Besides the `recommended` ruleset, `contract/redocly.yaml` adds configurable rules for every requirement that can be checked mechanically: operation metadata, documented parameters and properties with examples, bounded strings/arrays/integers, defaults on optional parameters, UPPERCASE enums, camelCase/PascalCase naming, kebab-case paths, valid examples and Problem Details on 4xx.

**Consequences.** A contract change that breaks a requirement fails CI. The rules were verified against a deliberately broken copy of the contract.

## 2. Multi-value filters instead of an `ALL` sentinel

**Context.** Optional parameters must have a `default` that belongs to the enum, but a single-value `state` filter has no real value meaning "no filter". Adding an artificial `ALL` value would pollute the domain enum.

**Decision.** `state` and `severity` are arrays of the real enums (`?state=REPORTED&state=IN_PROGRESS`, `style: form`, `explode: true`), with `maxItems` and a default containing every value. Omitting the parameter means "any". A single value (`?state=IN_PROGRESS`) keeps working as in the statement.

**Consequences.** Enums only contain real values. `ALL` exists only in the UI (React hook defaults); the hook translates it to "omit the parameter".

## 3. Simulated identity is described, not modelled as parameters

**Context.** The identity comes from `X-User-Team` and `X-User-Permissions`. The statement asks to describe this in `description` and to keep a global bearer scheme.

**Decision.** The headers are documented in `info.description` and in the `bearerAuth` scheme, not declared as parameters of each operation. A request without `X-User-Team` returns `401`; a caller without `tickets.read` gets `403` on ticket operations.

**Consequences.** The contract stays honest about the real security model (bearer). The frontend sets the headers in one place (the API client), not per call.

## 4. `expired` is computed by the server

**Context.** "Expired" depends on today's date. If the frontend computed it, the rule would be duplicated and could disagree with the backend (time zones, client clock).

**Decision.** `Ticket.expired` is a read-only boolean computed by the backend with its `Clock` (UTC).

**Consequences.** One owner for the rule; `expiredOnly` filtering and the UI flag always agree.

## 5. Not visible means 404

**Context.** A restricted ticket the caller cannot see could answer `403` or `404`.

**Decision.** `404`, identical to a missing ticket.

**Consequences.** The API does not leak the existence of restricted tickets.

## 6. PATCH check order

**Decision.** Permission (`403`) → visibility (`404`) → `DONE` (`409`) → due date before today (`422`). A malformed body is rejected with `422` before any check, because it is validated before reaching the handler.

**Consequences.** A caller without `tickets.update` learns nothing about the ticket. Documented in the operation description.

## 7. Full Stack statement wins on date formats and `assignedTeam`

**Context.** The React statement uses `date-time` for `targetDate`/`dueDate` and a nullable `assignedTeam`; the Full Stack one uses `date` and always has an assigned team.

**Decision.** Follow the Full Stack statement: `format: date` for `targetDate` and `dueDate`, `assignedTeam` required and not nullable. Listed in the README as a discrepancy.

## 8. Validation errors list the offending fields (`invalidParams`)

**Context.** A bare `422` tells the client that something is wrong, not what.

**Decision.** `Problem` has an optional `invalidParams` array (`name`, `reason`), an extension member as allowed by RFC 9457 (it follows the RFC's own "invalid-params" example, in camelCase). It is only present on `422`.

**Consequences.** The frontend can point at the wrong field; FastAPI's default validation format is replaced so every error has the same shape.

## 9. Malformed ticket id returns 422

**Context.** `GET`/`PATCH /api/v1/tickets/{id}` with an id that is not a UUID could answer `404` or `422`.

**Decision.** `422`: the id is declared as `format: uuid`, so a malformed one is an invalid parameter, consistent with the list endpoint. `404` is reserved for well-formed ids that do not exist or are not visible.

**Consequences.** The frontend detail page treats both `404` and `422` on the id as "not found" for the user.

## 10. Hexagonal architecture enforced by import-linter

**Context.** The hexagonal architecture is mandatory. Folder names alone do not stop a domain module from importing FastAPI or a use case from importing the in-memory repository.

**Decision.** `import-linter` contracts in `backend/pyproject.toml`, checked in CI:
- layers `main → infrastructure → application → domain`: an inner layer never imports an outer one;
- `domain` and `application` cannot import `fastapi`, `pydantic`, `starlette` or `uvicorn`;
- input and output adapters are independent of each other;
- only the FastAPI input adapter (`infrastructure/input/fastapi`) imports the web framework. It exposes the app as an `AsgiApp` protocol (ASGI is the standard interface between Python servers and frameworks), so `main.py` only wires and never references FastAPI.

**Consequences.** A dependency in the wrong direction fails CI. The contracts were verified with deliberately forbidden imports. Swapping persistence (SQLite, MongoDB) means a new output adapter plus a change in `main.py`, nothing else.

## 11. uv for the Python toolchain

**Context.** The statement does not mandate a package manager. Poetry and uv are both common.

**Decision.** uv: one tool for the Python version, virtualenv, dependencies and lockfile; standard `pyproject.toml` metadata (PEP 621, dependency groups from PEP 735); fast installs in CI. Same vendor as `ruff`.

**Consequences.** `uv sync` reproduces the exact environment from `uv.lock`; CI runs `uv sync --locked` and fails if the lockfile is stale.

## 12. `infrastructure/input|output` for the adapters

**Context.** Hexagonal adapters are commonly grouped either as `adapters/inbound|outbound` (Cockburn's "ports and adapters" vocabulary) or as `infrastructure/input|output` (common in DDD-style codebases).

**Decision.** `infrastructure/input` (driving adapters) and `infrastructure/output` (driven adapters). Inside them, each adapter is named after its technology: `input/fastapi`, `output/persistence` (in-memory). Ports stay in `application/ports`, owned by the core.

**Consequences.** Replacing a technology means adding a sibling folder (e.g. `input/litestar`, `output/mongodb`) and switching the wiring in `main.py`. The dependency rules are enforced by import-linter (decision 10). Inside `input/fastapi`, `from fastapi import ...` still resolves to the library because Python 3 imports are absolute.
