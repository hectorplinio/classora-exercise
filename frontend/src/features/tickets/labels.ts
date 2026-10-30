import type { Severity, TicketSortField, TicketState } from '../../api/generated/types.gen.ts';

// UI text stays in Spanish, as in the statement.
export const STATE_LABELS: Record<TicketState, string> = {
  REPORTED: 'Reportado',
  IN_PROGRESS: 'En curso',
  PENDING_SECURITY: 'Pendiente de seguridad',
  DONE: 'Hecho',
};

export const SEVERITY_LABELS: Record<Severity, string> = {
  CRITICAL: 'Crítica',
  HIGH: 'Alta',
  MEDIUM: 'Media',
  LOW: 'Baja',
};

export const SORT_LABELS: Record<TicketSortField, string> = {
  KEY: 'Clave',
  SEVERITY: 'Severidad',
  STATE: 'Estado',
  TARGET_DATE: 'Fecha límite',
  LAST_MODIFIED: 'Última modificación',
};
