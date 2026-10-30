import type { Severity, TicketState } from '../../api/generated/types.gen.ts';
import { SEVERITY_LABELS, STATE_LABELS } from './labels.ts';
import { SEVERITY_DOT_CLASSES } from './severityColors.ts';

const pill =
  'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap';

const STATE_STYLES: Record<TicketState, string> = {
  REPORTED: 'bg-zinc-100 text-zinc-700 ring-zinc-200',
  IN_PROGRESS: 'bg-sky-50 text-sky-800 ring-sky-200',
  PENDING_SECURITY: 'bg-violet-50 text-violet-800 ring-violet-200',
  DONE: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap text-zinc-800">
      <span aria-hidden="true" className={`size-2 rounded-full ${SEVERITY_DOT_CLASSES[severity]}`} />
      {SEVERITY_LABELS[severity]}
    </span>
  );
}

export function StateBadge({ state }: { state: TicketState }) {
  return <span className={`${pill} ring-1 ring-inset ${STATE_STYLES[state]}`}>{STATE_LABELS[state]}</span>;
}

export function ExpiredBadge() {
  return (
    <span className={`${pill} bg-red-50 text-red-700 ring-1 ring-inset ring-red-200`}>Caducado</span>
  );
}
