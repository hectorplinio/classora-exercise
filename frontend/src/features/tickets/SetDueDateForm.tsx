import { useForm } from 'react-hook-form';

import type { Ticket } from '../../api/generated/types.gen.ts';
import { ErrorMessage } from '../../shared/ErrorMessage.tsx';
import { today } from '../../shared/dates.ts';
import { useSetDueDate } from './useSetDueDate.ts';

type FormValues = { dueDate: string };

/**
 * "Fijar fecha compromiso". The date is checked here for quick feedback, but the server is the
 * authority: its 403, 409 and 422 answers are shown below the form.
 */
export function SetDueDateForm({ ticket }: { ticket: Ticket }) {
  const mutation = useSetDueDate(ticket.id);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ defaultValues: { dueDate: ticket.dueDate ?? '' } });
  const minDate = today();

  return (
    <form
      aria-labelledby="due-date-title"
      noValidate
      className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4"
      onSubmit={(event) => {
        void handleSubmit(({ dueDate }) => {
          mutation.mutate(dueDate);
        })(event);
      }}
    >
      <h3 id="due-date-title" className="font-semibold">
        Fijar fecha compromiso
      </h3>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Fecha compromiso
        <input
          type="date"
          min={minDate}
          aria-invalid={errors.dueDate ? true : undefined}
          aria-describedby={errors.dueDate ? 'due-date-error' : undefined}
          className="w-48 rounded-md border border-slate-300 px-3 py-1.5"
          {...register('dueDate', {
            required: 'Indica una fecha.',
            // YYYY-MM-DD strings compare like dates.
            validate: (value) => value >= minDate || 'La fecha no puede ser anterior a hoy.',
          })}
        />
      </label>
      {errors.dueDate && (
        <p id="due-date-error" className="text-sm text-red-700">
          {errors.dueDate.message}
        </p>
      )}
      <div>
        <button
          type="submit"
          disabled={mutation.isPending}
          className="rounded-md bg-blue-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50"
        >
          {mutation.isPending ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
      {mutation.isError && <ErrorMessage error={mutation.error} />}
      {mutation.isSuccess && (
        <p role="status" className="text-sm text-emerald-700">
          Fecha compromiso guardada.
        </p>
      )}
    </form>
  );
}
