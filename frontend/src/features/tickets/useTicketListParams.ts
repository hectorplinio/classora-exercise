import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';

import {
  DEFAULT_PARAMS,
  type TicketListParams,
  parseTicketListParams,
  toSearchParams,
} from './ticketListParams.ts';

export type TicketListFilters = Partial<Omit<TicketListParams, 'offset' | 'limit'>>;

/**
 * The list parameters, with the URL as the single source of truth: shareable links and working
 * back/forward buttons. Every change pushes a history entry; a change that leaves the URL as it
 * is does nothing.
 */
export function useTicketListParams() {
  const [searchParams, setSearchParams] = useSearchParams();
  const params = useMemo(() => parseTicketListParams(searchParams), [searchParams]);

  const navigate = useCallback(
    (next: TicketListParams) => {
      const nextSearch = toSearchParams(next);
      if (nextSearch.toString() !== searchParams.toString()) setSearchParams(nextSearch);
    },
    [searchParams, setSearchParams],
  );

  // A different filter or order is a different result: start again from the first page.
  const setFilters = useCallback(
    (patch: TicketListFilters) => {
      navigate({ ...params, ...patch, offset: 0 });
    },
    [navigate, params],
  );

  const setPage = useCallback(
    (offset: number) => {
      navigate({ ...params, offset });
    },
    [navigate, params],
  );

  const reset = useCallback(() => {
    navigate(DEFAULT_PARAMS);
  }, [navigate]);

  return { params, setFilters, setPage, reset };
}
