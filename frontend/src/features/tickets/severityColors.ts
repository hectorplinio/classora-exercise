import type { Severity } from '../../api/generated/types.gen.ts';

/** Tailwind class of each severity's colour dot (badges and filter chips). */
export const SEVERITY_DOT_CLASSES: Record<Severity, string> = {
  CRITICAL: 'bg-severity-critical',
  HIGH: 'bg-severity-high',
  MEDIUM: 'bg-severity-medium',
  LOW: 'bg-severity-low',
};
