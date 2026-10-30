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

## 22. REST adapter: controllers like the reference project, plus handlers for what never reaches them

**Decision.** One file per endpoint (`<action>_controller.py`) registered in a per-entity `router.py` with `add_api_route`. Each controller wraps its use case call in `try/except` and returns `handle_controller_error(e, logger)`, which maps the error class to a status with `HTTP_STATUS_CODE_BY_ERROR` and builds a Problem Details body; the cause and the traceback only go to the logs. Errors raised before a controller runs (Pydantic request validation, missing identity header, unknown routes, unexpected exceptions) are handled by app-level exception handlers that build the same body. Use cases reach controllers through `Annotated[..., Depends(...)]` providers that read the `Dependencies` built by `main.py` (no DI container, see decision 19).

**Consequences.** Every error, wherever it happens, has the contract's `application/problem+json` shape. Routes declare their Problem responses, so FastAPI no longer adds its own `HTTPValidationError` schema to `/openapi.json`.

## 23. Problem titles are fixed RFC 9110 phrases

**Context.** `http.HTTPStatus(422).phrase` is "Unprocessable Entity" in Python 3.11 and "Unprocessable Content" from 3.13. The CI step on 3.11 caught the difference.

**Decision.** Problem titles come from a fixed table of RFC 9110 phrases, not from the standard library.

## 24. Identity headers and `GET /me`

**Decision.** `X-User-Team` is required (blank or missing → 401). `X-User-Permissions` is a comma-separated list; values are trimmed and unknown ones are ignored, so a client cannot invent permissions. `GET /me` has no use case: the identity is resolved by a FastAPI dependency and the controller only maps it.

## 25. `expired` is computed in the response mapping with the server clock

**Decision.** The REST DTO calls the domain rule `ticket.is_expired(today)` with `today` from the injected `Clock`. The rule keeps a single owner (the domain); the adapter only decides when to evaluate it.

## 26. One pagination shape for every list

**Decision.** Every list endpoint is paginated and answers `{data, pagination: {offset, limit, totalElements}}`. The application layer has a generic `Page[T]` (`items`, `total_elements`), so `SearchTicketsResponse = Page[Ticket]`; the REST adapter has a generic `PageResponse[T]` with `from_page(page, offset, limit, item)` mapping each element. `TicketPageResponse` is just `PageResponse[TicketResponse]`.

**Consequences.** A new list endpoint only defines the DTO of its element; the envelope, field names and pagination fields are always the same.

## 27. Strict request validation where the contract asks for it

**Decision.** The query parameters of `GET /tickets` live in one Pydantic model (`SearchTicketsQuery`) with the contract limits and camelCase names. Repeated values in `state`/`severity` are rejected (`uniqueItems`). `dueDate` only accepts `YYYY-MM-DD`: by default Pydantic would also accept a Unix timestamp or a date-time as a date. The PATCH body forbids extra fields (`additionalProperties: false`).

**Consequences.** Anything the contract declares invalid gets a 422 with `invalidParams`, never a silently coerced value.

## 28. Postman collection checked with Newman

**Decision.** `docs/postman/` has a collection (one request per rule of the statement) and one environment per profile. The collection pre-request script sends the identity headers, so switching profile is switching environment. It was run with Newman against the real server for the four profiles; the expected codes are in `docs/postman/README.md`.

## 29. The served OpenAPI document is the contract

**Context.** FastAPI serves the spec it generates (OpenAPI 3.1), which is close to the contract but not identical (names of DTO schemas, 3.1 idioms, no descriptions or examples).

**Decision.** `main.py` loads `contract/openapi-rest.yml` (path overridable with `MINI_TICKETS_CONTRACT`) and the REST adapter serves it at `/openapi.json` and `/docs`, replacing `servers` with the running instance so "Try it out" works. The generated spec is still available to the tests through `generated_openapi(app)`.

**Consequences.** Clients and documentation always show exactly what was agreed. That the implementation matches it is the job of the conformance tests (decision 30).

## 30. Contract conformance: normalized comparison plus Schemathesis

**Context.** The statement requires that the generated spec does not contradict the contract (paths, parameters, status codes, schemas) and that errors follow the declared format, and asks to explain how this is checked.

**Decision.** Two complementary checks in the test suite. (1) A structural comparison of the generated spec and the contract per operation, after normalizing OpenAPI 3.1 vs 3.0 differences; it ignores documentation-only keys and limits FastAPI cannot express (e.g. `maxLength` implied by `format: uuid`). It was validated with nine deliberate contradictions. (2) Schemathesis, which fuzzes the running app from the contract. Excluded on purpose: the two bearer-enforcement checks (the bearer scheme is declared but identity is simulated with headers) and, only for the PATCH, "schema-valid input is accepted" (its 409/422 business rules cannot be expressed in a schema).

**Consequences.** Building the comparison surfaced three contradictions, fixed in the adapter: error responses documented as `application/json`, `Problem.type` not required and `detail`/`instance` nullable, and missing defaults for `state`/`severity`. Schemathesis found three bugs: a 405 without `Allow`, an `Allow` listing only one of the methods of `/tickets/{id}`, and an undecodable body answered with an undocumented 400 (now 422, like any malformed body).

## 31. API client generated from the contract with Hey API

**Context.** The statement requires the frontend types and API client to be derived from the contract, and responses to be validated at the boundary.

**Decision.** `@hey-api/openapi-ts` generates, from `contract/openapi-rest.yml`, the TypeScript types, the Zod schemas and a typed fetch SDK (`npm run generate:api` → `frontend/src/api/generated`). The SDK is configured to parse every response with its Zod schema, so data that breaks the contract never reaches the app. The generated code is committed (it is part of the reviewed code) and CI regenerates it and fails on any diff. Alternatives: `openapi-typescript` only generates types (Zod schemas would be hand-written or need a second tool); Orval is similar but heavier and centred on generating React Query hooks, which we prefer to write ourselves.

**Consequences.** A contract change that is not regenerated breaks CI; a backend response that does not match the contract is a validation error, not a silent bug. `exactOptionalPropertyTypes` is off because the generated client does not compile with it; the rest of `strict`, plus `noUncheckedIndexedAccess`, is on. A transitive `js-yaml` used only by the generator is pinned to a patched version with an npm override.

## 32. Frontend reaches the backend through the Vite proxy

**Decision.** In development the browser only talks to Vite, which forwards `/api` to the backend (`MINI_TICKETS_BACKEND_URL`, default `http://localhost:8000`). The generated client has no base URL, so every request is same-origin.

**Consequences.** No CORS configuration in the backend, no preflight requests for the custom `X-User-*` headers, and the same relative URLs work behind any reverse proxy in production.

## 33. Frontend structure: by feature, not hexagonal

**Context.** The statement requires a hexagonal backend; it says nothing about the frontend's structure.

**Decision.** The frontend is organised by feature (`api/`, `features/<feature>/`, `shared/`), keeping the useful part of hexagonal, the direction of dependencies: components never call `fetch`; they use hooks (TanStack Query), which use `api/`. Pure logic (labels, permissions, URL parameter normalization) lives in plain TypeScript functions. In tests MSW replaces the network, as test doubles replace the ports in the backend.

**Consequences.** Layers of ports and adapters on top of a generated client and TanStack Query would add indirection without testability or flexibility gains for an app of this size.

## 34. Profile switching: identity per request, profile in every query key

**Context.** Switching profile must reload the data with the new visibility and permissions, without leftovers from the previous one.

**Decision.** The selected profile lives in a React context (persisted in `localStorage` when available). Each query passes the identity headers of the profile it was made with (`identityHeaders(profile)`) instead of a global, mutable client setting, and every query key starts with the profile id. On switch, the TanStack Query cache is cleared. 4xx responses are not retried (they are answers, not transient failures).

**Consequences.** A request can never carry one profile's headers while its result is cached under another's, and no data of the previous profile is shown or kept in memory after a switch: the UI shows a loading state and fetches again.

## 35. Backend errors: `ApiError` plus one message per status

**Decision.** `unwrap()` turns a failed SDK call into an `ApiError` with the HTTP status and the Problem Details body, validated with the contract's Zod schema (or `null` if the body does not follow it; status `0` if the server could not be reached). `errorMessage()` maps the status to a Spanish UI message, distinguishing 403, 404, 409 and 422 (plus 401 and network errors). Screens that need more context (e.g. the due date form in a later PR) can read `problem.invalidParams`.

**Consequences.** Components never parse HTTP errors themselves; the mapping is a pure function with its own tests.

## 36. Tailwind CSS for styling

**Context.** The statement forbids component libraries with ready-made tables or forms and asks for semantic HTML and simple CSS.

**Decision.** Tailwind CSS v4 (Vite plugin, no config file), with a few theme colours for severities. It is a build-time CSS tool, not a component library: every table, form and control is our own semantic HTML.

**Consequences.** Styles live next to the markup, the shipped CSS only contains the classes in use, and there is no runtime dependency.

## 37. List parameters: the URL is the single source of truth

**Decision.** `useTicketListParams` is a thin layer over React Router's search params; the logic lives in two pure functions. `parseTicketListParams` normalizes any URL to valid parameters: an invalid number, enum or flag falls back to its default (`?offset=-5&limit=9999&state=FOO` is the default list), invalid and repeated values are dropped from multi-value filters, and texts are cut to the contract limits. `toSearchParams` writes only the values that differ from the defaults, in a fixed order. Changing a filter or the order goes back to `offset=0`; changing the page keeps the filters. Each change pushes a history entry (back/forward work) unless the URL stays the same.

**Consequences.** A manipulated or stale link never breaks the page nor reaches the backend unnormalized, URLs are clean and canonical, and the same parameters always produce the same query key.

## 38. State and severity filters are sets, not `ALL`

**Context.** The React statement models `state` and `severity` as one value with `ALL` as default. The contract (decision 4) has multi-value filters of real enum values, with every value as the default.

**Decision.** The hook follows the contract: `state` and `severity` are arrays, "every value selected" is the default and is not written to the URL. In the UI they are checkbox groups; the last checked option cannot be unchecked (an empty selection has no meaning).

## 39. Search debounce in the input, previous page kept per profile

**Decision.** `DebouncedInput` keeps the typed text locally and commits it after 300 ms without typing. The hook only maps the URL: putting the debounce there would make the URL (and the back button) lag behind or duplicate state. While a new page or filter loads, the table keeps the previous rows dimmed (`placeholderData`), but only if they belong to the same profile, so a profile switch never shows the previous profile's tickets.

**Consequences.** One request per pause in typing, not per keystroke; pagination does not flash an empty table.

## 40. Ticket detail and "Fijar fecha compromiso"

**Decision.**
- A 404 on the detail (the ticket does not exist or is not visible) renders the "not found" page, as the statement asks. A malformed id renders it too, without calling the backend.
- The action is shown only when `GET /me` includes `tickets.update`, and not for a `DONE` ticket (a note explains why). Hiding it is UX only: the backend still answers 403 and 409, and both are shown below the form, like a 422.
- The form (React Hook Form) checks that the date is not before today in the user's calendar, for quick feedback; the server, which uses its own clock, has the last word.
- After saving, the ticket the server returns replaces the cached detail (so it shows "En curso" at once), and every cached list of the profile is invalidated, because the new state or date can change which tickets match a filter and in which order. The update was later made optimistic (decision 43).
- The link from the list to the detail carries the list's query string in the navigation state, so "Volver al listado" keeps the filters.

## 41. 100% test coverage on both sides

**Decision.** As in the backend (`pytest --cov`), the frontend requires 100% line, branch and function coverage in CI (`npm run test:coverage`, Vitest with V8). Not measured: the generated API client (it comes from the contract and is checked by regeneration), test helpers, and `main.tsx` (the bootstrap, exercised by the end-to-end tests).

**Consequences.** Coverage is a floor, not the goal: measuring it found real gaps (the filters form wired to the URL, previous/first page, unavailable storage), now tested. A new branch without a test fails the build.

## 42. End-to-end tests against the real backend and the production build

**Decision.** Playwright starts the backend and serves the frontend's production build with `vite preview` (which proxies `/api` like the dev server), on dedicated ports and never reusing a running server. One worker, because the tests share one backend and one of them changes a ticket; each run starts from the deterministic seed, so the tickets used (SEC-1024, SEC-1128) are known. Scenarios check what the user sees (roles and labels), and the restricted-ticket scenario first proves the ticket exists (Security sees it) before asserting Developer does not.

**Consequences.** The tests cover the whole chain (UI, proxy, identity headers, REST adapter, use cases, domain) as delivered. Running them repeatedly found a real race: re-selecting the current profile cleared the cache without re-rendering, leaving the page loading forever; selecting the active profile is now a no-op, with a unit test. One browser (Chromium) is enough: the scenarios test integration, not cross-browser rendering.

## 43. Optimistic due date update (React test, question 3)

**Decision.** `useSetDueDate` applies the change (date, and `REPORTED` → `IN_PROGRESS`) at once to the cached detail and to every cached list of the profile, rolls everything back if the server fails, stores the server's ticket on success and invalidates the lists when it ends. A row that no longer matches its list's filter stays, updated, until the refetch removes it. A 422 that the server explains for `dueDate` (`invalidParams`) is shown on the field.

**Consequences.** The user sees the result immediately and never a state the server rejected. The client does not reimplement the server's filtering, sorting or pagination; the price is that a non-matching row is visible for the duration of one request.
