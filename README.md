# Mini Tickets

Security tickets assigned to development teams. Technical test for Classora (Full Stack + React senior).

The API is defined first in an OpenAPI 3.0 contract; the FastAPI backend (hexagonal architecture) implements it and is checked against it, and the React frontend derives its types from it.

> Work in progress: the frontend, end-to-end tests and Docker sections are completed in their own PRs.

## Repository layout

| Path | Content |
| --- | --- |
| `contract/openapi-rest.yml` | OpenAPI 3.0.3 contract, source of truth for the API |
| `contract/redocly.yaml` | Lint rules that enforce the statement's contract requirements |
| `backend/` | FastAPI backend (Python 3.11+, hexagonal architecture) |
| `frontend/` | React 18 + TypeScript SPA (Vite) |
| `react-senior/` | React test: code review and written answers |
| `docs/decisions.md` | Short notes on every relevant technical decision |
| `docs/postman/` | Postman collection and one environment per profile |

## Backend

### Requirements

- [uv](https://docs.astral.sh/uv/) (it installs the right Python version, 3.11+, by itself)

### Run

```bash
cd backend
uv sync
uv run uvicorn tickets.main:create_app --factory --reload
```

- API: `http://localhost:8000/api/v1`
- Interactive docs (the contract, with "Try it out"): `http://localhost:8000/docs`

There is no login: the caller is simulated with two headers, as the statement asks.

| Profile | `X-User-Team` | `X-User-Permissions` |
| --- | --- | --- |
| Developer | `Payments` | `tickets.read` |
| Team lead | `Payments` | `tickets.read,tickets.update` |
| Security | `Security Champions` | `tickets.read,tickets.update,tickets.read.all` |

```bash
curl -s localhost:8000/api/v1/tickets?limit=5 \
  -H 'X-User-Team: Payments' -H 'X-User-Permissions: tickets.read'
```

Data lives in memory and is loaded from a deterministic seed of 60 tickets on start (every state and severity, several teams, restricted, expired and `asset = "None"` tickets; dates relative to today). Changes are lost on restart, and the server must run a single worker: each process would have its own copy.

### Postman

Import the files in [`docs/postman/`](docs/postman/README.md): a collection with one request per rule of the statement and one environment per profile. Switching profile is switching environment; the README there lists the expected status code of every request for every profile.

### Checks and tests

From `backend/`:

| Command | What it checks |
| --- | --- |
| `uv run pytest` | Unit (domain, use cases), API, contract conformance and Schemathesis tests |
| `uv run pytest --cov` | Same, with line and branch coverage; fails below 100% (abstract port methods excluded) |
| `uv run ruff check` / `uv run ruff format --check` | Lint and formatting |
| `uv run mypy` | Type checking (`strict`) |
| `uv run lint-imports` | Hexagonal architecture rules (see below) |

CI runs all of them on every PR, plus the test suite again on Python 3.11 (the minimum version), and lints the contract:

```bash
npx @redocly/cli@2.72.1 lint contract/openapi-rest.yml --config contract/redocly.yaml
```

### Architecture

Hexagonal (ports and adapters). Dependencies always point inwards, and that is enforced by [import-linter](https://import-linter.readthedocs.io/) contracts in `backend/pyproject.toml`, checked in CI.

```
backend/src/tickets/
├── domain/                     # entities and business rules; no framework, no I/O
│   ├── ticket/model.py         #   Ticket: visibility, expiry, set due date
│   └── user/model.py           #   User and permissions
├── application/                # use cases and the ports they need
│   ├── shared/                 #   ClockInterface, Page[T]
│   └── ticket/
│       ├── repository_port.py  #   TicketRepositoryInterface
│       └── usecases/           #   <action>_port.py (interface + request/response) + <action>_usecase.py
├── infrastructure/
│   ├── input/fastapi/          # REST adapter: the only code that imports FastAPI
│   │   ├── shared/             #   errors → Problem Details, identity headers, pagination, DI
│   │   ├── user/  ticket/      #   router.py + one <action>_controller.py per endpoint + DTOs
│   │   └── app.py
│   └── output/
│       ├── ticket/in_memory/   # repository + seed
│       └── clock/              # SystemClock: the only place that reads the time
├── shared/errors.py            # every error class; lowest layer
└── main.py                     # single composition root: wires adapters to use cases
```

| Rule (import-linter) | Meaning |
| --- | --- |
| Layers `main → infrastructure → application → domain → shared` | An inner layer never imports an outer one |
| Core is framework-free | `domain`, `application` and `shared` cannot import FastAPI, Pydantic, Starlette or uvicorn |
| Independent adapters | Input and output adapters do not import each other |
| Framework only in its adapter | Only `infrastructure/input/fastapi` imports the web framework |

Errors: the domain and use cases raise classes from `shared/errors.py` (`EntityNotFoundError`, `EntityConflictError`, `UnprocessableEntityError`, `AuthorizationError`, `AuthenticationError`); the REST adapter maps them to 404/409/422/403/401 Problem Details in one table (`HTTP_STATUS_CODE_BY_ERROR`).

## Contract conformance

The statement requires that what FastAPI generates does not contradict the contract and that errors have the declared format. Three layers check it, all in `uv run pytest` and therefore in CI:

1. **Generated spec vs contract** (`backend/tests/contract/test_openapi_conformance.py`). The spec FastAPI derives from the routes and DTOs is compared with the contract, operation by operation: paths and methods, `operationId` and tags, parameters (name, location, required, type, enum, default and limits), request bodies, response codes and media types, and request/response schemas (properties, required members, types, formats, nullability, extra-properties policy). OpenAPI 3.1 vs 3.0 differences are normalized first (`anyOf: [X, null]` vs `nullable: true`, `allOf: [$ref]` vs `$ref`); what is compared and why is documented in `tests/utils/openapi.py`. The tests were verified by introducing nine deliberate contradictions (a limit, a nullable field, an email format, a renamed parameter, an undeclared status code, a changed type…): each one fails.
2. **Schemathesis against the running app** (`backend/tests/contract/test_schemathesis.py`). From the contract it generates valid and invalid requests for every operation and checks: no 5xx, only documented status codes and media types, response bodies matching their schemas, invalid input rejected, valid input accepted, correct `Allow` headers. Two checks are excluded on purpose, because the contract's bearer scheme is declared but not enforced (identity is simulated with headers); "valid input is accepted" is excluded only for the PATCH, whose 409/422 business rules cannot be expressed in a schema. It found three real bugs, now fixed and covered by regression tests: a lost `Allow` header on 405, an incomplete `Allow` header when a path has several routes, and an undecodable body answered with an undocumented 400 instead of 422.
3. **Error format** (`backend/tests/infrastructure/input/fastapi/`). Every error path (domain errors, validation, missing identity, unknown routes, unexpected exceptions) is asserted to answer `application/problem+json` with the contract's shape.

The served documentation is the contract itself: `/openapi.json` and `/docs` return `contract/openapi-rest.yml` (with `servers` pointing to the running instance), not the generated spec, so clients see exactly what was agreed.

## Frontend

### Requirements

- Node.js 22.18+ (CI uses 24)

### Run

Start the backend first (see above), then:

```bash
cd frontend
npm ci
npm run dev
```

The app is at `http://localhost:5173`.

### Connection to the backend

In development the browser only talks to Vite, which proxies `/api` to the backend (`http://localhost:8000`, or `MINI_TICKETS_BACKEND_URL`). Requests are same-origin, so the backend needs no CORS configuration and the custom identity headers do not trigger preflight requests.

### API client from the contract

`npm run generate:api` generates the types, Zod schemas and a typed fetch client from `contract/openapi-rest.yml` into `src/api/generated` (never edited by hand). Every response is parsed with its Zod schema before reaching the app. CI regenerates the client and fails if it differs from the committed one, so the frontend cannot drift from the contract.

### Checks and tests

From `frontend/`:

| Command | What it checks |
| --- | --- |
| `npm test` | Unit and component tests (Vitest, Testing Library, MSW) |
| `npm run typecheck` | TypeScript (`strict`) |
| `npm run lint` | ESLint (`typescript-eslint` strict, type-checked) |
| `npm run generate:api` | Regenerates the API client from the contract |

## End-to-end tests

_Completed in the e2e PR._

## Technical decisions

Every relevant decision, with its context and consequences, is in [`docs/decisions.md`](docs/decisions.md).

## Discrepancies between statements

When the two statements disagree, the Full Stack one wins (it says so itself):

| Topic | React statement | Full Stack statement (followed) |
| --- | --- | --- |
| `targetDate`, `dueDate` | `date-time` | `date` (`YYYY-MM-DD`) |
| `assignedTeam` | `string \| null` | always present |
| `title`, `creatorTeam`, `restricted`, `createdAt` | not in the ticket | in the ticket |
| Operations | `GET /tickets`, `PATCH /tickets/{id}`, `GET /me` | plus `GET /tickets/{id}` |

Additions not required by either statement, documented in `docs/decisions.md`: `401` when the identity header is missing, `403` without `tickets.read`, a server-computed `expired` flag, and `invalidParams` in 422 Problem Details.

## What I would do with more time

_Completed in the last PR._
