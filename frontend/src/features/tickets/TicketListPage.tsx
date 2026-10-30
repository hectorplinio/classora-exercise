import { ErrorMessage } from '../../shared/ErrorMessage.tsx';
import { ExpiredCount } from './ExpiredCount.tsx';
import { Pagination } from './Pagination.tsx';
import { TicketFilters } from './TicketFilters.tsx';
import { TicketTable, TicketTableSkeleton } from './TicketTable.tsx';
import { useTicketListParams } from './useTicketListParams.ts';
import { useTickets } from './useTickets.ts';

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
