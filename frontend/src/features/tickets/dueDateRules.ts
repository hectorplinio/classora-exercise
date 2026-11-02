import type { RegisterOptions } from 'react-hook-form';

export type DueDateFormValues = { dueDate: string };

export const PAST_DATE = 'La fecha no puede ser anterior a hoy.';

/** Quick feedback before calling the server, which stays the authority (422). */
export function dueDateRules(minDate: string): RegisterOptions<DueDateFormValues, 'dueDate'> {
  return {
    required: 'Indica una fecha.',
    // YYYY-MM-DD strings compare like dates.
    validate: (value) => value >= minDate || PAST_DATE,
  };
}
