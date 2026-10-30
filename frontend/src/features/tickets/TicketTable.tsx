import type { SortDirection, Ticket, TicketSortField } from '../../api/generated/types.gen.ts';
import { formatDate, formatDateTime } from '../../shared/dates.ts';
import { ExpiredBadge, SeverityBadge, StateBadge } from './Badges.tsx';
import { SORT_LABELS } from './labels.ts';

type Props = {
  tickets: readonly Ticket[];
  sort: TicketSortField;
  direction: SortDirection;
  onSort: (sort: TicketSortField, direction: SortDirection) => void;
  busy: boolean;
};

const cell = 'px-3 py-2 text-left';

export function TicketTable({ tickets, sort, direction, onSort, busy }: Props) {
  const sortable = (field: TicketSortField) => (
    <SortableHeader field={field} sort={sort} direction={direction} onSort={onSort} />
  );

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table aria-busy={busy} className={`w-full text-sm ${busy ? 'opacity-60' : ''}`}>
        <thead className="border-b border-slate-200 bg-slate-100 text-xs uppercase text-slate-600">
          <tr>
            {sortable('KEY')}
            <th scope="col" className={cell}>Título</th>
            <th scope="col" className={cell}>Activo</th>
            <th scope="col" className={cell}>Equipo asignado</th>
            {sortable('SEVERITY')}
            {sortable('STATE')}
            {sortable('TARGET_DATE')}
            <th scope="col" className={cell}>Fecha compromiso</th>
            {sortable('LAST_MODIFIED')}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {tickets.length === 0 ? (
            <tr>
              <td colSpan={9} className="px-3 py-8 text-center text-slate-500">
                No hay tickets que cumplan los filtros.
              </td>
            </tr>
          ) : (
            tickets.map((ticket) => (
              <tr key={ticket.id} className="hover:bg-slate-50">
                <th scope="row" className={`${cell} font-mono font-medium whitespace-nowrap`}>
                  {ticket.key}
                </th>
                <td className={cell}>{ticket.title}</td>
                <td className={`${cell} font-mono text-xs`}>{ticket.asset}</td>
                <td className={cell}>{ticket.assignedTeam}</td>
                <td className={cell}>
                  <SeverityBadge severity={ticket.severity} />
                </td>
                <td className={cell}>
                  <StateBadge state={ticket.state} />
                </td>
                <td className={`${cell} whitespace-nowrap`}>
                  {formatDate(ticket.targetDate)} {ticket.expired && <ExpiredBadge />}
                </td>
                <td className={`${cell} whitespace-nowrap`}>
                  {ticket.dueDate ? formatDate(ticket.dueDate) : '—'}
                </td>
                <td className={`${cell} whitespace-nowrap`}>{formatDateTime(ticket.lastModified)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
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
    <th scope="col" aria-sort={ariaSort} className={cell}>
      <button
        type="button"
        className="inline-flex items-center gap-1 uppercase hover:text-slate-900"
        onClick={() => {
          onSort(field, active && direction === 'ASC' ? 'DESC' : 'ASC');
        }}
      >
        {SORT_LABELS[field]}
        <span aria-hidden="true">{active ? (direction === 'ASC' ? '↑' : '↓') : '↕'}</span>
      </button>
    </th>
  );
}
