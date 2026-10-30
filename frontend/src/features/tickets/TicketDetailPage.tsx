import type { ReactNode } from 'react';
import { Link, useLocation, useParams } from 'react-router';

import { ApiError } from '../../api/client.ts';
import type { Ticket } from '../../api/generated/types.gen.ts';
import { ErrorMessage } from '../../shared/ErrorMessage.tsx';
import { NotFoundPage } from '../../shared/NotFoundPage.tsx';
import { formatDate, formatDateTime } from '../../shared/dates.ts';
import { useHasPermission } from '../user/useHasPermission.ts';
import { ExpiredBadge, SeverityBadge, StateBadge } from './Badges.tsx';
import { SetDueDateForm } from './SetDueDateForm.tsx';
import { useTicket } from './useTicket.ts';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A malformed id cannot be a ticket: "not found" without asking the backend. */
export function TicketDetailPage() {
  const { id = '' } = useParams();
  return UUID.test(id) ? <TicketDetail id={id} /> : <NotFoundPage />;
}

function TicketDetail({ id }: { id: string }) {
  const { data: ticket, error, isPending } = useTicket(id);
  const canUpdate = useHasPermission('tickets.update');

  // A ticket that does not exist and one the user cannot see are the same: not found.
  if (error instanceof ApiError && error.status === 404) return <NotFoundPage />;

  return (
    <section aria-labelledby="ticket-title" className="flex flex-col gap-4">
      <BackToList />
      {error ? (
        <ErrorMessage error={error} />
      ) : isPending ? (
        <p className="text-slate-500">Cargando…</p>
      ) : (
        <>
          <h2 id="ticket-title" className="text-xl font-semibold">
            <span className="font-mono">{ticket.key}</span> · {ticket.title}
          </h2>
          <TicketFields ticket={ticket} />
          {canUpdate &&
            (ticket.state === 'DONE' ? (
              <p className="text-sm text-slate-600">
                El ticket está cerrado: ya no se puede fijar la fecha compromiso.
              </p>
            ) : (
              <SetDueDateForm ticket={ticket} />
            ))}
        </>
      )}
    </section>
  );
}

/** Back to the list with the filters it had (they travel in the navigation state). */
function BackToList() {
  const location = useLocation();
  const state: unknown = location.state;
  const from =
    typeof state === 'object' && state !== null && 'from' in state && typeof state.from === 'string'
      ? state.from
      : '';

  return (
    <Link to={`/tickets${from}`} className="text-sm text-blue-700 underline">
      ← Volver al listado
    </Link>
  );
}

function TicketFields({ ticket }: { ticket: Ticket }) {
  const fields: [string, ReactNode][] = [
    ['Activo', <span className="font-mono">{ticket.asset}</span>],
    ['Equipo creador', ticket.creatorTeam],
    ['Equipo asignado', ticket.assignedTeam],
    ['Responsable', ticket.assignee],
    ['Severidad', <SeverityBadge severity={ticket.severity} />],
    ['Estado', <StateBadge state={ticket.state} />],
    ['Restringido', ticket.restricted ? 'Sí' : 'No'],
    [
      'Fecha límite',
      <>
        {formatDate(ticket.targetDate)} {ticket.expired && <ExpiredBadge />}
      </>,
    ],
    ['Fecha compromiso', ticket.dueDate ? formatDate(ticket.dueDate) : '—'],
    ['Creado', formatDateTime(ticket.createdAt)],
    ['Última modificación', formatDateTime(ticket.lastModified)],
  ];

  return (
    <dl className="grid gap-x-6 gap-y-3 rounded-lg border border-slate-200 bg-white p-4 text-sm sm:grid-cols-[max-content_1fr]">
      {fields.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="font-medium text-slate-600">{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
