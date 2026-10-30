import { useForm } from 'react-hook-form';

import { ApiError } from '../../api/client.ts';

import type { Ticket } from '../../api/generated/types.gen.ts';
import { ErrorMessage } from '../../shared/ErrorMessage.tsx';
import { today } from '../../shared/dates.ts';
import { useSetDueDate } from './useSetDueDate.ts';

type FormValues = { dueDate: string };

const PAST_DATE = 'La fecha no puede ser anterior a hoy.';

/** A 422 that the server explains for the date field (`invalidParams`). */
function rejectsDueDate(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    error.status === 422 &&
    (error.problem?.invalidParams ?? []).some((param) => param.name === 'dueDate')
  );
}

/**
 * "Fijar fecha compromiso". The date is checked here for quick feedback, but the server is the
 * authority: a 422 on the date is shown on the field, and any other error (403, 409…) below the
 * form. The ticket shows the new date at once (optimistic update) and reverts if the server fails.
 */
export function SetDueDateForm({ ticket }: { ticket: Ticket }) {
  const mutation = useSetDueDate(ticket.id);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({ defaultValues: { dueDate: ticket.dueDate ?? '' } });
  const minDate = today();

  return (
    <form
      aria-labelledby="due-date-title"
      noValidate
      className="card flex flex-col gap-4 p-5"
      onSubmit={(event) => {
        void handleSubmit(({ dueDate }) => {
          mutation.mutate(dueDate, {
            onError: (error) => {
              if (rejectsDueDate(error)) setError('dueDate', { message: PAST_DATE });
            },
          });
        })(event);
      }}
    >
      <div>
        <h3 id="due-date-title" className="font-semibold tracking-tight">
          Fijar fecha compromiso
        </h3>
        <p className="mt-1 text-sm text-zinc-500">
          Fecha en la que el equipo se compromete a resolverlo. Un ticket reportado pasa a estar en
          curso.
        </p>
      </div>
      <label className="flex flex-col gap-1.5">
        <span className="label">Fecha compromiso</span>
        <input
          type="date"
          min={minDate}
          aria-invalid={errors.dueDate ? true : undefined}
          aria-describedby={errors.dueDate ? 'due-date-error' : undefined}
          className="field aria-invalid:border-red-500"
          {...register('dueDate', {
            required: 'Indica una fecha.',
            // YYYY-MM-DD strings compare like dates.
            validate: (value) => value >= minDate || PAST_DATE,
          })}
        />
      </label>
      {errors.dueDate && (
        <p id="due-date-error" className="-mt-2 text-sm text-red-700">
          {errors.dueDate.message}
        </p>
      )}
      <div>
        <button type="submit" disabled={mutation.isPending} className="btn-primary w-full">
          {mutation.isPending ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
      {mutation.isError && !rejectsDueDate(mutation.error) && (
        <ErrorMessage error={mutation.error} />
      )}
      {mutation.isSuccess && (
        <p
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800"
        >
          Fecha compromiso guardada.
        </p>
      )}
    </form>
  );
}
