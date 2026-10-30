import type {
  Severity,
  SortDirection,
  TicketSortField,
  TicketState,
} from '../../api/generated/types.gen.ts';
import {
  zSeverity,
  zSortDirection,
  zTicketSortField,
  zTicketState,
} from '../../api/generated/zod.gen.ts';

/** The list parameters, always valid and complete. Values and limits come from the contract. */
export type TicketListParams = {
  offset: number;
  limit: number;
  q: string;
  state: readonly TicketState[];
  severity: readonly Severity[];
  assignedTeam: string;
  expiredOnly: boolean;
  sort: TicketSortField;
  direction: SortDirection;
};

export const TICKET_STATES: readonly TicketState[] = zTicketState.options;
export const SEVERITIES: readonly Severity[] = zSeverity.options;
const SORT_FIELDS: readonly TicketSortField[] = zTicketSortField.unwrap().options;
const SORT_DIRECTIONS: readonly SortDirection[] = zSortDirection.unwrap().options;

const MAX_OFFSET = 100_000;
const MAX_LIMIT = 100;
const MAX_QUERY_LENGTH = 256;
const MAX_TEAM_LENGTH = 100;

// Every state and every severity selected is the same as no filter (the contract's default).
export const DEFAULT_PARAMS: TicketListParams = {
  offset: 0,
  limit: 20,
  q: '',
  state: TICKET_STATES,
  severity: SEVERITIES,
  assignedTeam: '',
  expiredOnly: false,
  sort: 'LAST_MODIFIED',
  direction: 'DESC',
};

function integer(value: string | null, min: number, max: number, fallback: number): number {
  if (value === null || !/^\d+$/.test(value)) return fallback;
  const number = Number(value);
  return number >= min && number <= max ? number : fallback;
}

function oneOf<T extends string>(options: readonly T[], value: string | null, fallback: T): T {
  return options.find((option) => option === value) ?? fallback;
}

/** Valid values only, without duplicates and in the contract's order; none left means all. */
function subsetOf<T extends string>(options: readonly T[], values: readonly string[]): readonly T[] {
  const selected = options.filter((option) => values.includes(option));
  return selected.length > 0 ? selected : options;
}

/**
 * Reads the parameters from the URL. A manipulated URL never breaks the page nor reaches the
 * backend: an invalid value is ignored and its default is used instead.
 */
export function parseTicketListParams(search: URLSearchParams): TicketListParams {
  return {
    offset: integer(search.get('offset'), 0, MAX_OFFSET, DEFAULT_PARAMS.offset),
    limit: integer(search.get('limit'), 1, MAX_LIMIT, DEFAULT_PARAMS.limit),
    q: (search.get('q') ?? '').slice(0, MAX_QUERY_LENGTH),
    state: subsetOf(TICKET_STATES, search.getAll('state')),
    severity: subsetOf(SEVERITIES, search.getAll('severity')),
    assignedTeam: (search.get('assignedTeam') ?? '').slice(0, MAX_TEAM_LENGTH),
    expiredOnly: search.get('expiredOnly') === 'true',
    sort: oneOf(SORT_FIELDS, search.get('sort'), DEFAULT_PARAMS.sort),
    direction: oneOf(SORT_DIRECTIONS, search.get('direction'), DEFAULT_PARAMS.direction),
  };
}

/** Writes the parameters to the URL, skipping those with their default value (clean URLs). */
export function toSearchParams(params: TicketListParams): URLSearchParams {
  const current = serialize(parseTicketListParams(serialize(params)));
  const defaults = serialize(DEFAULT_PARAMS);
  const search = new URLSearchParams();
  for (const name of new Set(current.keys())) {
    const values = current.getAll(name);
    if (values.join() === defaults.getAll(name).join()) continue;
    for (const value of values) search.append(name, value);
  }
  return search;
}

function serialize(params: TicketListParams): URLSearchParams {
  const search = new URLSearchParams();
  search.set('q', params.q);
  for (const state of params.state) search.append('state', state);
  for (const severity of params.severity) search.append('severity', severity);
  search.set('assignedTeam', params.assignedTeam);
  search.set('expiredOnly', String(params.expiredOnly));
  search.set('sort', params.sort);
  search.set('direction', params.direction);
  search.set('offset', String(params.offset));
  search.set('limit', String(params.limit));
  return search;
}
