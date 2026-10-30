# React senior test: answers

The React statement's questions answered against this repository. Its code is not a separate sandbox: the rewritten component, the contract and the hook are the real application, compiled (`npm run typecheck`), linted and tested (100% coverage, plus end-to-end tests) in CI.

| Question | Where |
| --- | --- |
| 1. Code review | [below](#question-1--code-review); rewrite in `frontend/src/features/tickets/` |
| 2A. Contract | [`contract/openapi-rest.yml`](../contract/openapi-rest.yml); [keeping types in sync](#question-2a--keeping-the-typescript-types-and-the-contract-in-sync) |
| 2B. `useTicketListParams` | [`useTicketListParams.ts`](../frontend/src/features/tickets/useTicketListParams.ts), [notes](#question-2b--useticketlistparams) |
| 3. Optimistic update (optional) | [`useSetDueDate.ts`](../frontend/src/features/tickets/useSetDueDate.ts), [answers](#question-3--optimistic-update-and-permissions) |

Where the React statement and the Full Stack one disagree (dates as `date`, `state`/`severity` as multi-value filters instead of `ALL`, extra ticket fields), the Full Stack one is followed; see the discrepancies in the [main README](../README.md#discrepancies-between-statements).

## Question 1 — Code review

<details>
<summary>The component under review</summary>

```tsx
export function TicketsPage() {
  const { teamId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tickets, setTickets] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const offset = parseInt(searchParams.get("offset")!);
  const limit = 20;
  const state = searchParams.get("state") || "ALL";
  useEffect(() => {
    setLoading(true);
    fetch(`/api/v1/teams/${teamId!}/tickets?offset=${offset}&limit=${limit}&state=${state}&q=${search}`)
      .then((r) => r.json())
      .then((body) => {
        setTickets(body.data);
        setTotal(body.pagination.totalElements);
        setLoading(false);
      });
  }, [offset, state, search]);
  const changeState = (value: string) => {
    searchParams.set("state", value);
    setSearchParams(searchParams);
  };
  const expired = tickets.filter((t) => new Date(t.targetDate) < new Date());
  return (
    <div>
      <input value={search} onChange={(e) => setSearch(e.target.value)} />
      <select value={state} onChange={(e) => changeState(e.target.value)}>
        <option value="ALL">Todos</option>
        <option value="REPORTED">Reportado</option>
        <option value="IN_PROGRESS">En curso</option>
        <option value="DONE">Hecho</option>
      </select>
      {loading && <Spinner />}
      <p>{expired.length} tickets caducados</p>
      <table>
        <tbody>
          {tickets.map((t, i) => (
            <TicketRow key={i} ticket={t} onChange={() => setTickets([...tickets])} />
          ))}
        </tbody>
      </table>
      <Pagination total={total} offset={offset} limit={limit} onChange={(o: number) => {
        searchParams.set("offset", String(o));
        setSearchParams(searchParams);
      }} />
    </div>
  );
}
```

</details>

### Issues, by severity

Each issue says what the user (or the maintainer) suffers, and the test that now guards against it.

#### Critical: the page does not work

1. **The first load always fails.** Without `offset` in the URL, `parseInt(null!)` is `NaN`, the request says `offset=NaN`, and the backend answers 422. The default state is sent as `state=ALL`, which is not a value of the enum: another 422. A user opening the page sees nothing.
   _Now:_ every parameter is parsed and normalized from the URL with the contract's defaults (`parseTicketListParams`); `?offset=-5&limit=9999&state=FOO` is the default list. Tests: `ticketListParams.test.ts`, "the request is built from the URL, normalized" in `TicketListPage.test.tsx`.
2. **The endpoint is not in the contract.** `/api/v1/teams/{teamId}/tickets` does not exist (404). The team is a filter of `GET /api/v1/tickets` (`assignedTeam`), and `teamId!` hides a missing route parameter by sending `undefined`.
   _Now:_ requests are made with the client generated from the contract: a path or parameter that is not in it does not compile. The team is the "Equipo asignado" filter.
3. **Errors are ignored, and the spinner never stops.** `fetch` does not reject on 4xx/5xx: `r.json()` parses a Problem Details body, `body.data` is `undefined`, and `tickets.map` crashes the page. A network failure is an unhandled rejection with `loading` stuck at `true`. The user sees a blank page or an endless spinner, never a message.
   _Now:_ TanStack Query owns loading and error states; `unwrap` turns any failure into an `ApiError` and the page shows a message per status (403, 404, 409, 422). Tests: `client.test.ts`, "a backend error is shown instead of the table".
4. **Responses arrive out of order.** Nothing cancels or ignores a previous request: if the response for an old filter arrives last, the table shows results that do not match the filters on screen. With one request per keystroke (issue 7) this happens constantly.
   _Now:_ each combination of parameters is its own query key, so a late response is stored under its own key and never shown for another one. Test: "a slow response of a previous filter never replaces the current result".
5. **The query string is not encoded.** `q=${search}` with `&`, `#` or `+` breaks the request or injects parameters (`log4j&state=DONE`).
   _Now:_ the generated client serializes the query (including multi-value `state=…&state=…`).

#### High: wrong behaviour

6. **Stale data from incomplete dependencies.** The effect does not depend on `teamId` (or `limit`): navigating to another team keeps the previous team's tickets. `react-hooks/exhaustive-deps` would flag it.
   _Now:_ there is no hand-written effect; the query key includes every parameter.
7. **The search is not in the URL and fires a request per keystroke.** Searching cannot be shared, back/forward does not restore it, and typing "log4j" sends five requests (and five races, issue 4).
   _Now:_ `q` lives in the URL like every other parameter, and `DebouncedInput` commits it after 300 ms without typing. Tests: `DebouncedInput.test.tsx`, "typing a search sends one request after the user stops typing".
8. **Changing a filter keeps the page.** Filtering from page 5 asks for page 5 of a result that may have one page: an empty table. Also, `searchParams` is mutated in place, which React Router does not expect.
   _Now:_ `setFilters` always goes back to `offset=0`, `setPage` keeps the filters, and new `URLSearchParams` are built each time. Tests: `useTicketListParams.test.tsx`.
9. **The expired count is wrong.** It only counts the current page (20 tickets, not the total), compares an instant with `new Date()` in the browser's time zone, and counts `DONE` tickets, which are never expired.
   _Now:_ the server counts them across every page, with visibility and the domain rule applied (`expiredOnly=true&limit=1`, `ExpiredCount`). Test: "counts the expired tickets matching the filters across every page".

#### Medium: maintenance and correctness at the edges

10. **`any` everywhere.** A field renamed in the API compiles and fails at runtime. _Now:_ types and Zod schemas are generated from the contract, and every response is validated at the boundary. Test: `generated.test.ts`.
11. **`key={i}` and `onChange={() => setTickets([...tickets])}`.** Index keys attach a row's state (an open form, focus) to another ticket when the order changes. Copying the array to force a render means the row mutates the ticket object in place, and the change is never sent nor reflected in other lists. _Now:_ `key={ticket.id}`; the due date is changed with a mutation that updates the cached ticket and invalidates the lists.
12. **The state filter is incomplete.** `PENDING_SECURITY` is missing, and `ALL` is a value the API does not accept. _Now:_ options come from the contract's enum, as checkboxes (several states at once).

#### Low: accessibility and UX

13. **Controls without labels.** The search box and the select have no accessible name. _Now:_ every control has a `<label>`; the tests find them by role and name, so a missing label fails them.
14. **The spinner covers stale results without saying so**, and there are no identity headers (the API needs `X-User-Team` and `X-User-Permissions`). _Now:_ the previous page stays dimmed with `aria-busy` while the next one loads, and every request carries the selected profile's headers.

### The rewrite

The rewritten page is [`TicketListPage.tsx`](../frontend/src/features/tickets/TicketListPage.tsx):

```tsx
export function TicketListPage() {
  const { params, setFilters, setPage, reset } = useTicketListParams();
  const { data, error, isPending, isPlaceholderData } = useTickets(params);

  return (
    <section aria-labelledby="tickets-title" className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="tickets-title" className="text-2xl font-semibold tracking-tight">
            Tickets
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Vulnerabilidades asignadas a los equipos de desarrollo.
          </p>
        </div>
        <ExpiredCount params={params} />
      </div>
      <TicketFilters params={params} onChange={setFilters} onReset={reset} />
      {error ? (
        <ErrorMessage error={error} />
      ) : isPending ? (
        <TicketTableSkeleton />
      ) : (
        <>
          <TicketTable
            tickets={data.data}
            sort={params.sort}
            direction={params.direction}
            onSort={(sort, direction) => {
              setFilters({ sort, direction });
            }}
            busy={isPlaceholderData}
          />
          <Pagination pagination={data.pagination} onChange={setPage} />
        </>
      )}
    </section>
  );
}
```

What changed, in short:

- **The URL is the only state.** `useTicketListParams` reads valid parameters from it and writes clean URLs; there is no `useState` copy of what the URL already says.
- **No hand-written fetching.** `useTickets` is a TanStack Query hook over the generated client: caching, deduplication, late responses kept under their own key (never shown for other filters), retries only for server errors, and the profile in the query key.
- **Small components with one job** (`TicketFilters`, `DebouncedInput`, `TicketTable`, `Pagination`, `ExpiredCount`), each tested.
- **Typed end to end**, from the contract to the props.

## Question 2A — Keeping the TypeScript types and the contract in sync

They cannot drift because the types are not written: they are generated.

1. The contract (`contract/openapi-rest.yml`) is the single source of truth. `npm run generate:api` (Hey API) generates the TypeScript types, Zod schemas and a typed client from it.
2. The generated code is committed and CI regenerates it and fails on any difference: a contract change without regenerating, or a hand edit of generated code, cannot be merged.
3. At runtime every response is parsed with the generated Zod schema, so a backend that does not follow the contract fails loudly at the boundary instead of deep inside a component.
4. On the backend side, tests compare the spec FastAPI generates with the contract and fuzz the running API with Schemathesis, so both ends are held to the same document.

The contract is linted in CI (Redocly) with the statement's rules (descriptions, examples, limits, naming, enums in upper case).

## Question 2B — `useTicketListParams`

- Hook: [`useTicketListParams.ts`](../frontend/src/features/tickets/useTicketListParams.ts); pure parsing and serialization: [`ticketListParams.ts`](../frontend/src/features/tickets/ticketListParams.ts).
- Tests (`renderHook` with `MemoryRouter`): [`useTicketListParams.test.tsx`](../frontend/src/features/tickets/useTicketListParams.test.tsx) and [`ticketListParams.test.ts`](../frontend/src/features/tickets/ticketListParams.test.ts): defaults, manipulated URLs, filter change resets `offset`, page change keeps filters, defaults not written, `reset`, back button, no duplicated history entries.
- `state` and `severity` are lists (every value selected by default) because that is what the contract defines; see decision 38 in [`docs/decisions.md`](../docs/decisions.md).

**Where the debounce goes, and why.** In the input component (`DebouncedInput`), not in the hook. The hook is a plain mapping of the URL: if it debounced, the URL and the back button would lag behind what the user sees, or the hook would need a second copy of the state. The input keeps what is being typed locally and commits to the URL only when the user pauses, so every committed value is a real navigation (shareable, back-button friendly) and one request.

## Question 3 — Optimistic update and permissions

### 1. `useSetDueDate()` with an optimistic update

[`useSetDueDate.ts`](../frontend/src/features/tickets/useSetDueDate.ts), a TanStack Query mutation:

- `onMutate`: cancels the requests in flight for the ticket and the lists (a late response must not overwrite the optimistic data), takes a snapshot, and applies what the server will do (`withDueDate`: the new date, and `IN_PROGRESS` if it was `REPORTED`) to the cached detail and to every cached list.
- `onError`: puts every snapshot back. The form shows the error (403, 409, or a 422 on the date field).
- `onSuccess`: stores the ticket the server returned, which is the truth (`lastModified`, any rule the client does not know).
- `onSettled`: invalidates the lists.

In this application the action lives in the ticket detail rather than in each row (the Full Stack statement only asks for the action, and the detail has room for a labelled form). The hook does not depend on where it is used: because it updates every cached list, the row already shows the new date and state when the user goes back to the list.

### 2. Several cached lists, and a row that no longer matches the filter

Every cached list of the profile (any filters, any page) is updated in place, by prefix of the query key (`setQueriesData`), and all of them are invalidated when the mutation ends, so the server decides the final content of each one.

If the row stops matching the active filter (the filter is `state=REPORTED` and the ticket becomes `IN_PROGRESS`), it **stays visible, updated, until the refetch**, and then disappears. Removing it optimistically would mean reimplementing the server's filtering, sorting and pagination in the client (`expired` depends on the server's date, positions and `totalElements` change, the next page would have to shift a ticket in), and would make the row jump away from under the pointer of the user who just changed it. Keeping it until the server answers is predictable and never shows a wrong page.

### 3. The action only for users with `tickets.update`

[`useHasPermission('tickets.update')`](../frontend/src/features/user/useHasPermission.ts) reads the permissions of `GET /me`, cached per profile; the detail renders the form only when it is true (and not for `DONE` tickets).

**Hiding the button is not enough.** It is UX, not security: anyone can call the API directly, and permissions can change between loading `/me` and clicking. The backend checks the permission on every request and answers 403; the client handles that 403 like any other failure (rollback and a message). In this repository the backend tests assert the 403, and the end-to-end tests check both that the action is hidden and that the restricted ticket is a 404.

### 4. Testing 200, 403 and 409 without a real backend

With **MSW** in Vitest: the handlers answer like the backend (including Problem Details bodies), and the tests drive the real components with Testing Library. In [`TicketDetailPage.test.tsx`](../frontend/src/features/tickets/TicketDetailPage.test.tsx):

- 200: the new date and "En curso" show before the server answers (the handler waits), then the success message.
- 403, 409, 422: the message is shown, and the ticket and every cached list go back to what they were.
- 422 on the date: the server's `invalidParams` puts the error on the field.
- The action is not rendered for a profile without `tickets.update`.

Removing the rollback or the optimistic update of the lists makes these tests fail.
