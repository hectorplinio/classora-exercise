import { Link, useLocation, useNavigate } from 'react-router';

import type { SortDirection, Ticket, TicketSortField } from '../../api/generated/types.gen.ts';
import { formatDate, formatDateTime } from '../../shared/dates.ts';
import { InboxIcon, LockIcon } from '../../shared/icons.tsx';
import { ExpiredBadge, SeverityBadge, StateBadge } from './Badges.tsx';
import { SORT_LABELS } from './labels.ts';

type Props = {
  tickets: readonly Ticket[];
  sort: TicketSortField;
  direction: SortDirection;
  onSort: (sort: TicketSortField, direction: SortDirection) => void;
  busy: boolean;
};

const head = 'px-4 py-2.5 text-left text-xs font-medium tracking-wide text-zinc-500 uppercase';
const cell = 'px-4 py-3 align-top';

export function TicketTable({ tickets, sort, direction, onSort, busy }: Props) {
  // The detail page links back to the list with the same filters.
  const { search } = useLocation();
  const navigate = useNavigate();
  const sortable = (field: TicketSortField) => (
    <SortableHeader field={field} sort={sort} direction={direction} onSort={onSort} />
  );

  return (
    <div className="card overflow-x-auto">
      <table
        aria-busy={busy}
        className={`w-full min-w-[56rem] text-sm transition-opacity ${busy ? 'opacity-50' : ''}`}
      >
        <thead className="border-b border-zinc-200 bg-zinc-50/60">
          <tr>
            {sortable('KEY')}
            <th scope="col" className={head}>
              Ticket
            </th>
            <th scope="col" className={head}>
              Equipo asignado
            </th>
            {sortable('SEVERITY')}
            {sortable('STATE')}
            {sortable('TARGET_DATE')}
            <th scope="col" className={head}>
              Fecha compromiso
            </th>
            {sortable('LAST_MODIFIED')}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {tickets.length === 0 ? (
            <tr>
              <td colSpan={8} className="px-4 py-16">
                <div className="flex flex-col items-center gap-2 text-zinc-400">
                  <InboxIcon />
                  <p className="text-sm text-zinc-500">No hay tickets que cumplan los filtros.</p>
                </div>
              </td>
            </tr>
          ) : (
            tickets.map((ticket) => (
              <tr
                key={ticket.id}
                // The key is the accessible link; the whole row is clickable as a shortcut.
                onClick={() => {
                  void navigate(`/tickets/${ticket.id}`, { state: { from: search } });
                }}
                className="cursor-pointer transition-colors hover:bg-zinc-50"
              >
                <th scope="row" className={`${cell} text-left font-normal whitespace-nowrap`}>
                  <Link
                    to={`/tickets/${ticket.id}`}
                    state={{ from: search }}
                    onClick={(event) => {
                      event.stopPropagation();
                    }}
                    className="rounded font-mono text-[13px] font-medium text-zinc-900 underline-offset-4 hover:underline"
                  >
                    {ticket.key}
                  </Link>
                </th>
                <td className={`${cell} max-w-sm`}>
                  <p className="font-medium text-zinc-900">{ticket.title}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 font-mono text-xs text-zinc-500">
                    {ticket.asset}
                    {ticket.restricted && (
                      <span className="inline-flex items-center gap-1 font-sans text-zinc-500">
                        · <LockIcon /> Restringido
                      </span>
                    )}
                  </p>
                </td>
                <td className={`${cell} whitespace-nowrap text-zinc-700`}>{ticket.assignedTeam}</td>
                <td className={cell}>
                  <SeverityBadge severity={ticket.severity} />
                </td>
                <td className={cell}>
                  <StateBadge state={ticket.state} />
                </td>
                <td className={`${cell} whitespace-nowrap tabular-nums`}>
                  <span className="flex items-center gap-2">
                    {formatDate(ticket.targetDate)} {ticket.expired && <ExpiredBadge />}
                  </span>
                </td>
                <td className={`${cell} whitespace-nowrap tabular-nums text-zinc-700`}>
                  {ticket.dueDate ? formatDate(ticket.dueDate) : <span className="text-zinc-300">—</span>}
                </td>
                <td className={`${cell} whitespace-nowrap tabular-nums text-zinc-500`}>
                  {formatDateTime(ticket.lastModified)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

/** Rows shaped like the table while the first page loads. */
export function TicketTableSkeleton() {
  return (
    <div className="card overflow-hidden" aria-busy="true">
      <p className="sr-only">Cargando…</p>
      <div className="h-10 border-b border-zinc-200 bg-zinc-50/60" />
      {Array.from({ length: 8 }, (_, row) => (
        <div key={row} className="flex items-center gap-6 border-b border-zinc-100 px-4 py-4 last:border-0">
          <div className="h-3.5 w-16 animate-pulse rounded bg-zinc-100" />
          <div className="h-3.5 flex-1 animate-pulse rounded bg-zinc-100" />
          <div className="h-3.5 w-20 animate-pulse rounded bg-zinc-100" />
          <div className="h-3.5 w-24 animate-pulse rounded bg-zinc-100" />
        </div>
      ))}
    </div>
  );
}

type SortableHeaderProps = {
  field: TicketSortField;
  sort: TicketSortField;
  direction: SortDirection;
  onSort: (sort: TicketSortField, direction: SortDirection) => void;
};

/** Clicking the sorted column flips the direction; clicking another one sorts it ascending. */
function SortableHeader({ field, sort, direction, onSort }: SortableHeaderProps) {
  const active = field === sort;
  const ariaSort = active ? (direction === 'ASC' ? 'ascending' : 'descending') : 'none';

  return (
    <th scope="col" aria-sort={ariaSort} className={head}>
      <button
        type="button"
        className={`-mx-1 inline-flex items-center gap-1 rounded px-1 uppercase transition-colors hover:text-zinc-900 ${active ? 'text-zinc-900' : ''}`}
        onClick={() => {
          onSort(field, active && direction === 'ASC' ? 'DESC' : 'ASC');
        }}
      >
        {SORT_LABELS[field]}
        <span aria-hidden="true" className={active ? '' : 'text-zinc-300'}>
          {active ? (direction === 'ASC' ? '↑' : '↓') : '↕'}
        </span>
      </button>
    </th>
  );
}
