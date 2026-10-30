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

**Decision.** `infrastructure/input` (driving adapters) and `infrastructure/output` (driven adapters). Inside them, each adapter is named after its technology: `input/fastapi`, `output/ticket/in_memory`. Ports stay in the application layer (`application/<entity>/repository_port.py`, `application/shared/`), owned by the core.

**Consequences.** Replacing a technology means adding a sibling folder (e.g. `input/litestar`, `output/mongodb`) and switching the wiring in `main.py`. The dependency rules are enforced by import-linter (decision 10). Inside `input/fastapi`, `from fastapi import ...` still resolves to the library because Python 3 imports are absolute.

## 13. Immutable domain entities

**Context.** The in-memory repository hands out object references. A mutable `Ticket` could be changed by a caller without going through `TicketRepository.save`, and the change would silently "persist".

**Decision.** `Ticket` and `User` are frozen dataclasses. `Ticket.set_due_date` returns a new ticket; the use case saves it explicitly.

**Consequences.** State changes only happen through the repository, as they would with a real database. Domain objects are safe to share between requests.

## 14. The domain never reads the clock

**Context.** Expiry and the due date rule depend on "today". Reading the system clock inside the domain makes the rules time-dependent and hard to test.

**Decision.** Domain methods receive `today` and `now` as arguments. Only the `Clock` port (implemented in infrastructure) knows the current time, always in UTC.

**Consequences.** Domain tests are deterministic, with fixed dates and no mocking of `datetime`.

## 15. One shared module of error classes, mapped to HTTP in one place

**Context.** Errors can be modelled as one class per rule (`TicketAlreadyDoneError`, …) or as a small set of classes per kind of failure, with the specifics in the message.

**Decision.** A small hierarchy in `shared/errors.py`, raised from any layer with a free-form message:
`MiniTicketsError` → `DomainError` → `EntityNotFoundError` (404), `EntityConflictError` (409), `UnprocessableEntityError` (422, with `details` field → reason); and `AuthorizationError` (403). New classes (e.g. `AuthenticationError`) are added there when something raises them. The FastAPI adapter maps class → status code in a single function; anything else is a 500. Low-level exceptions are wrapped with `raise ... from e`.

**Consequences.** The class carries the kind of failure, never the HTTP status, so the core stays transport-agnostic. Adding an error kind is one class plus one line in the mapping. `shared` is the lowest layer in the import-linter contracts and is framework-free. Domain `details` use domain field names (`due_date`); the adapter translates them to API names (`dueDate`).

## 16. Use cases follow the reference project's shape, synchronously

**Context.** The team's reference project defines, per operation, an `ABC` use case interface with its request/response (`<action>_port.py`) and an implementation with `execute` (`<action>_usecase.py`); repositories are `ABC` ports per entity. Its use cases are `async`.

**Decision.** Same shape: `application/ticket/repository_port.py`, `application/shared/clock_port.py`, `application/ticket/usecases/{search_tickets,get_ticket,set_ticket_due_date}_{port,usecase}.py`. Requests and responses are frozen dataclasses (the application layer cannot import Pydantic). Everything is synchronous: the only adapters are in memory, and FastAPI runs sync endpoints in a thread pool.

**Consequences.** Moving to a database with an async driver means adding `async`/`await` to the ports and use cases; the design does not change.

## 17. Search rules live in the use case, not in the repository

**Context.** Visibility, filters, sorting and pagination could be pushed into `TicketRepository`.

**Decision.** The repository only stores tickets (`get_by_id`, `list_all`, `save`). `SearchTicketsUseCase` applies visibility first (so hidden tickets are never counted), then the filters, then a stable sort (by `id` first, then by the requested field: Python's sort is stable even with `reverse=True`), then the page slice.

**Consequences.** Visibility is a domain rule and never leaks into infrastructure. With a real database these criteria would be translated into the query (e.g. a specification object), keeping the same use case contract.

## 18. Sort semantics

**Decision.** Ascending means: `KEY` in natural order (`SEC-999` before `SEC-1024`, which plain string order gets wrong), `SEVERITY` from `LOW` to `CRITICAL`, `STATE` in lifecycle order, dates from oldest to newest. Documented in the `sort` parameter of the contract.

## 19. Dependency injection without a container library

**Context.** The reference project wires everything with `dependency-injector` containers and `@inject` in controllers.

**Decision.** Plain constructor injection: use cases receive their ports in `__init__`, and `main.py` builds the object graph by hand. The statement asks for a single composition point; with three use cases a container would add more code and concepts than it wires, and `Provide[...]` would couple controllers to the container.

**Consequences.** Adding a container later only changes `main.py`.

## 20. Deterministic seed relative to the clock

**Context.** The statement asks for 50+ varied tickets, including expired ones. Hard-coded dates would stop being "expired" or "not expired" as time passes, and random data makes demos and e2e tests unstable.

**Decision.** `build_seed_tickets(now)` generates 60 tickets (the statement's example `SEC-1024` plus 59 derived from their index): every state × severity combination, five assigned teams, tickets created by Security Champions or by the team itself, restricted tickets hidden from other teams, `asset = "None"`. Ids are UUIDv5 of the key. `targetDate` = creation date + an SLA by severity (CRITICAL 7 days, HIGH 30, MEDIUM 60, LOW 90), with creation dates relative to `now`. `REPORTED` tickets never have a due date, since setting one moves them to `IN_PROGRESS`.

**Consequences.** Same data on every start, and always a mix of expired and non-expired tickets. A test checks this for `now`, one year and ten years later.

## 21. In-memory repository guarded by a lock

**Context.** FastAPI runs sync endpoints in a thread pool, so the repository can be used from several threads at once.

**Decision.** `InMemoryTicketRepository` guards its dict with a `threading.Lock`, and `list_all` returns a copy. `SystemClock` is the only code that reads the system time.

**Consequences.** Individual operations are safe. Two concurrent PATCHes on the same ticket are last-write-wins: there is no optimistic locking (a `version` field checked on save). Acceptable for an in-memory exercise; listed under "what I would do with more time".
