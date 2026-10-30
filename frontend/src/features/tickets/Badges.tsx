import type { Severity, TicketState } from '../../api/generated/types.gen.ts';
import { SEVERITY_LABELS, STATE_LABELS } from './labels.ts';

const badge = 'inline-block rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap';

const SEVERITY_STYLES: Record<Severity, string> = {
  CRITICAL: 'bg-severity-critical text-white',
  HIGH: 'bg-severity-high text-white',
  MEDIUM: 'bg-severity-medium text-slate-900',
  LOW: 'bg-severity-low text-white',
};

const STATE_STYLES: Record<TicketState, string> = {
  REPORTED: 'bg-slate-200 text-slate-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  PENDING_SECURITY: 'bg-violet-100 text-violet-800',
  DONE: 'bg-emerald-100 text-emerald-800',
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return <span className={`${badge} ${SEVERITY_STYLES[severity]}`}>{SEVERITY_LABELS[severity]}</span>;
}

export function StateBadge({ state }: { state: TicketState }) {
  return <span className={`${badge} ${STATE_STYLES[state]}`}>{STATE_LABELS[state]}</span>;
}

export function ExpiredBadge() {
  return <span className={`${badge} bg-red-100 text-red-800`}>Caducado</span>;
}
