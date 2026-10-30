import type { TicketListParams } from './ticketListParams.ts';
import { useTickets } from './useTickets.ts';

/**
 * How many tickets matching the filters are expired, across every page. The server counts them
 * (`expiredOnly` with `limit=1` only needs `totalElements`): it applies visibility and the
 * domain rule (not DONE, target date before today), which a count over the visible page cannot.
 */
export function ExpiredCount({ params }: { params: TicketListParams }) {
  const { data } = useTickets({ ...params, expiredOnly: true, offset: 0, limit: 1 });
  if (!data) return null;

  const count = data.pagination.totalElements;
  return (
    <p className="text-sm text-slate-600">
      {count === 1 ? '1 ticket caducado' : `${String(count)} tickets caducados`}
    </p>
  );
}
