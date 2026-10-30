# CLAUDE.md — Mini Tickets (Classora technical test)

## Context

This repo contains a technical test for a Full Stack position. It must look and read like production-quality work from a senior engineer. The candidate will defend every decision in a live review, so **explain non-obvious choices** in `docs/decisions.md` and never add code the candidate cannot explain.

The two original statements (PDFs) live in `statements/` (gitignored). They are the source of truth:
- `PT_FullStack.pdf` → complete exercise (contract + backend + frontend + integration).
- `PT_React.pdf` → questions 1 and 2 are required; question 3 is optional.

If this file and the statements disagree, **the statements win**. If the two statements disagree with each other, the Full Stack functional description wins, and the discrepancy is noted in `README.md`.

## Language

- Everything in **English**: code, identifiers, comments, branch names, commit messages, PR titles and descriptions, contract, README, docs.
- Exception: UI labels shown to the user may stay in Spanish ("En curso", "Fijar fecha compromiso", "No encontrado") because the statement uses them. Note this in the README.

## Repository layout

```
contract/openapi-rest.yml   # single-file OpenAPI 3.0.x contract (source of truth for the API)
backend/                    # Python 3.11+, FastAPI, Pydantic v2, hexagonal architecture
frontend/                   # React 18, strict TypeScript, Vite
react-senior/               # React test: code review (Q1) and written answers
docs/decisions.md           # short ADR-style notes, one per decision
docker-compose.yml          # nice-to-have
README.md
```

## Git workflow (mandatory)

- `main` is protected. **Never commit to `main` directly.** Every change goes through a branch and a PR.
- Work on **one PR at a time**, following `statements/PLAN.md` (gitignored) in order. Stop when a PR is ready and wait for the candidate to review and merge it before starting the next one.
- **Never commit before the candidate has reviewed the changes.** Leave the work uncommitted, list the changed files with a short summary of each, and wait for explicit approval. Push and open PRs only when asked.
- Branch names: `feat/...`, `fix/...`, `test/...`, `chore/...`, `docs/...`.
- Commits: Conventional Commits, small and meaningful (e.g. `feat(backend): add set due date use case`). The commit history is evaluated: never squash everything into one commit.
- Merge method: rebase and merge (keeps every commit, linear history).
- Every PR description has three sections: **What**, **Why**, **How to test**.
- CI must be green before merging.

## Backend rules

- Tooling: `uv`, `ruff` (lint + format), `mypy --strict`, `pytest`.
- **Hexagonal architecture (mandatory):**
  - `domain/`: entities, value objects and business rules (visibility, expiry, due date transition). One folder per entity (`ticket/`, `user/`) with a `model.py`. **No imports from FastAPI, Pydantic or persistence.** Entities are frozen dataclasses.
  - `application/<entity>/`: `repository_port.py` (outbound port, `ABC`) and `usecases/`, with one pair of files per operation: `<action>_port.py` (use case interface, `ABC`, plus its request/response dataclasses) and `<action>_usecase.py` (implementation, method `execute`). Cross-cutting ports in `application/shared/` (e.g. `clock_port.py`).
  - `infrastructure/input/fastapi/`: input adapter, the only module that imports FastAPI. `app.py` (app factory exposed as an `AsgiApp` protocol), `<entity>/router.py` plus one `<action>_controller.py` per endpoint with its own Pydantic DTOs (camelCase aliases), `shared/handle_controller_error.py` with `HTTP_STATUS_CODE_BY_ERROR` (error class → status, Problem Details body), header-based user.
  - `infrastructure/output/<entity>/<technology>/repository.py` (e.g. `ticket/in_memory/repository.py`) and other driven adapters such as `output/clock/system_clock.py`.
  - `main.py`: the **single composition root**. Wires adapters to use cases; never imports FastAPI.
  - `shared/errors.py`: every application error (see "Error handling" below). Lowest layer: importable from everywhere, imports nothing.
- Ports and use cases are synchronous (in-memory adapters). Dependencies are injected through constructors and wired by hand in `main.py` (no DI container library).
- Never call `date.today()` or `datetime.now()` outside the `Clock` adapter. All dates in UTC.
- Errors use **Problem Details (RFC 9457)** with `application/problem+json`, including FastAPI's validation errors (replace the default 422 format).
- Tests:
  - `tests/` mirrors `src/tickets/` (`tests/domain/...`, `tests/application/...`, `tests/infrastructure/...`); helpers (builders, test doubles) in `tests/utils/`.
  - Domain and use case unit tests **without FastAPI**, using test doubles (`FakeTicketRepository`, `FixedClock`).
  - API tests for every rule in the statement.
  - Write tests first (TDD) for domain and use cases.

## API conventions

- Every endpoint that returns a list is paginated (`offset`/`limit`, `limit` ≤ 100) and answers `{data, pagination: {offset, limit, totalElements}}`. List use cases return `application/shared/pagination.py::Page[T]`; controllers map it with `infrastructure/input/fastapi/shared/pagination.py::PageResponse[T].from_page`.
- Query parameters of a list endpoint live in one Pydantic model (`<Action>Query`) with the contract limits; bodies forbid extra fields.
- Keep `docs/postman/` in sync when an endpoint is added or changed.

## Error handling

- All errors live in `backend/src/tickets/shared/errors.py`. Do not create error modules per entity or per layer: reuse a class or add a new one there.
- The class says what kind of failure happened, the message says what exactly. Every class extends `MiniTicketsError`:
  - `DomainError` (business rule) → `EntityNotFoundError` (404), `EntityConflictError` (409), `UnprocessableEntityError(message, details)` (422, `details` maps domain field → reason).
  - `AuthorizationError` (403).
  - Add `AuthenticationError` (401) or `ApplicationError` only when something raises them.
- Raise them from any layer. Wrap low-level exceptions with `raise ... from e`; never leak them.
- The HTTP mapping (error class → status, Problem Details body) lives only in the FastAPI input adapter. Any other exception → 500 without internal details.
- Invalid parameters or body are 422, never 400 (statement).

## Frontend rules

- Vite + React 18 + strict TypeScript. Allowed libraries only: React Router, TanStack Query, Zod, React Hook Form, Vitest, Testing Library, MSW (+ Playwright for e2e, + a codegen tool for the contract, + Tailwind CSS for styling). **No component libraries** with ready-made tables or forms. Semantic HTML styled with Tailwind utility classes.
- Types and API client are **derived from the contract** (generated), never written by hand. Responses are validated with Zod at the boundary. CI regenerates and fails if there is a diff.
- Dev connection to the backend through the **Vite proxy** (same origin, no CORS).
- The current profile is part of every query key; switching profile clears the cache.

## Key decisions (document each one in `docs/decisions.md`)

- Restricted ticket not visible → **404**, never 403 (do not leak existence).
- Visibility is a domain rule, applied **before** pagination and counting.
- Stable sort: always tie-break by `id`.
- PATCH check order: permission (403) → visibility (404) → DONE (409) → past date (422).
- Hiding the action in the UI is UX only; the backend always enforces 403.
- Search debounce lives in the input component, not in `useTicketListParams`.

## Known pitfalls

- FastAPI generates **OpenAPI 3.1**; the contract is **3.0.x**. Contract conformance checks must normalize differences (e.g. `nullable: true` vs `type: [..., "null"]`).
- FastAPI adds its own `HTTPValidationError` 422 schema: replace it in responses and in `/openapi.json`.
- The request body is validated before the handler, so a malformed body returns 422 even without permission. Document this.
- Dates differ between statements: Full Stack uses `date` for `targetDate`/`dueDate`; React uses `date-time`. Follow Full Stack and note it.
- `asset = "None"` is a string, not null.

## Commands

Keep these working and listed in the README:
- Backend: `uv run pytest`, `uv run ruff check`, `uv run mypy`, `uv run lint-imports`, `uv run uvicorn tickets.main:create_app --factory`
- Frontend: `npm run dev`, `npm run test`, `npm run typecheck`, `npm run lint`, `npm run generate:api`
- E2E (from `frontend/`): `npm run test:e2e`
