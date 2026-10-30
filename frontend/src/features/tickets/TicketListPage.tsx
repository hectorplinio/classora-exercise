import { ErrorMessage } from '../../shared/ErrorMessage.tsx';
import { ExpiredCount } from './ExpiredCount.tsx';
import { Pagination } from './Pagination.tsx';
import { TicketFilters } from './TicketFilters.tsx';
import { TicketTable } from './TicketTable.tsx';
import { useTicketListParams } from './useTicketListParams.ts';
import { useTickets } from './useTickets.ts';

export function TicketListPage() {
  const { params, setFilters, setPage, reset } = useTicketListParams();
  const { data, error, isPending, isPlaceholderData } = useTickets(params);

  return (
    <section aria-labelledby="tickets-title" className="flex flex-col gap-4">
      <h2 id="tickets-title" className="text-xl font-semibold">
        Tickets
      </h2>
      <TicketFilters params={params} onChange={setFilters} onReset={reset} />
      <ExpiredCount params={params} />
      {error ? (
        <ErrorMessage error={error} />
      ) : isPending ? (
        <p className="text-slate-500">Cargando…</p>
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
