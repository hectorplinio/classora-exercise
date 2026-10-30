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
    <section aria-labelledby="ticket-title" className="flex flex-col gap-6">
      <BackToList />
      {error ? (
        <ErrorMessage error={error} />
      ) : isPending ? (
        <DetailSkeleton />
      ) : (
        <>
          <header className="flex flex-col gap-3">
            <h2 id="ticket-title" className="text-2xl font-semibold tracking-tight text-balance">
              <span className="font-mono text-zinc-400">{ticket.key}</span> · {ticket.title}
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <StateBadge state={ticket.state} />
              <SeverityBadge severity={ticket.severity} />
              {ticket.expired && <ExpiredBadge />}
            </div>
          </header>
          <div className="grid items-start gap-6 lg:grid-cols-3">
            <TicketFields ticket={ticket} />
            <aside className="flex flex-col gap-4">
              {!canUpdate ? (
                <Note>Necesitas el permiso tickets.update para fijar la fecha compromiso.</Note>
              ) : ticket.state === 'DONE' ? (
                <Note>El ticket está cerrado: ya no se puede fijar la fecha compromiso.</Note>
              ) : (
                <SetDueDateForm ticket={ticket} />
              )}
            </aside>
          </div>
        </>
      )}
    </section>
  );
}

function Note({ children }: { children: ReactNode }) {
  return <p className="card p-5 text-sm text-zinc-600">{children}</p>;
}

function DetailSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-6">
      <p className="sr-only">Cargando…</p>
      <div className="h-8 w-2/3 animate-pulse rounded bg-zinc-100" />
      <div className="card h-72 animate-pulse lg:w-2/3" />
    </div>
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
    <Link
      to={`/tickets${from}`}
      className="inline-flex w-fit items-center gap-1.5 rounded text-sm text-zinc-500 transition-colors hover:text-zinc-900"
    >
      <span aria-hidden="true">←</span> Volver al listado
    </Link>
  );
}

function TicketFields({ ticket }: { ticket: Ticket }) {
  const fields: [string, ReactNode][] = [
    ['Activo', <span className="font-mono text-[13px]">{ticket.asset}</span>],
    ['Equipo creador', ticket.creatorTeam],
    ['Equipo asignado', ticket.assignedTeam],
    ['Responsable', ticket.assignee],
    ['Severidad', <SeverityBadge severity={ticket.severity} />],
    ['Estado', <StateBadge state={ticket.state} />],
    ['Restringido', ticket.restricted ? 'Sí' : 'No'],
    [
      'Fecha límite',
      <span className="flex items-center gap-2 tabular-nums">
        {formatDate(ticket.targetDate)} {ticket.expired && <ExpiredBadge />}
      </span>,
    ],
    ['Fecha compromiso', ticket.dueDate ? formatDate(ticket.dueDate) : '—'],
    ['Creado', formatDateTime(ticket.createdAt)],
    ['Última modificación', formatDateTime(ticket.lastModified)],
  ];

  return (
    <dl className="card grid gap-x-8 gap-y-5 p-5 text-sm sm:grid-cols-2 lg:col-span-2">
      {fields.map(([label, value]) => (
        <div key={label} className="flex flex-col gap-1">
          <dt className="label">{label}</dt>
          <dd className="text-zinc-900">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
