import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';

import type { Ticket } from '../../api/generated/types.gen.ts';
import { errorMessage } from '../../shared/errorMessages.ts';
import { today } from '../../shared/dates.ts';
import { CloseIcon } from '../../shared/icons.tsx';
import { type DueDateFormValues, dueDateRules } from './dueDateRules.ts';
import { useSetDueDate } from './useSetDueDate.ts';

/**
 * "Fijar fecha compromiso" inside a row of the list. Saving closes the editor at once: the row
 * already shows the new date (and "En curso") through the optimistic update. If the server
 * fails, the row goes back to what it was and the error is shown under the action.
 */
export function RowDueDateAction({ ticket }: { ticket: Ticket }) {
  const mutation = useSetDueDate(ticket.id);
  const [editing, setEditing] = useState(false);
  const openButton = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DueDateFormValues>({ defaultValues: { dueDate: ticket.dueDate ?? '' } });
  const minDate = today();

  // Closing the editor removes the focused element: give the focus back to the button.
  useEffect(() => {
    if (!editing && returnFocus.current) {
      returnFocus.current = false;
      openButton.current?.focus();
    }
  }, [editing]);

  const close = () => {
    returnFocus.current = true;
    setEditing(false);
  };

  // The server answers 409 for a closed ticket: the action is not offered.
  if (ticket.state === 'DONE') return null;

  return (
    <div className="flex w-32 flex-col items-start gap-1">
      {editing ? (
        <form
          aria-label={`Fijar fecha compromiso de ${ticket.key}`}
          noValidate
          className="flex w-full flex-col gap-1.5"
          onKeyDown={(event) => {
            if (event.key === 'Escape') close();
          }}
          onSubmit={(event) => {
            void handleSubmit(({ dueDate }) => {
              mutation.mutate(dueDate);
              close();
            })(event);
          }}
        >
          <input
            type="date"
            aria-label="Fecha compromiso"
            min={minDate}
            // The user has just asked for the editor: the date is what they will type next.
            autoFocus
            aria-invalid={errors.dueDate ? true : undefined}
            className="field h-8 w-full py-1 text-xs aria-invalid:border-red-500"
            {...register('dueDate', dueDateRules(minDate))}
          />
          <div className="flex gap-1.5">
            <button type="submit" className="btn-primary h-7 flex-1 px-2 text-xs">
              Guardar
            </button>
            <button
              type="button"
              aria-label="Cancelar"
              className="btn-secondary size-7 px-0"
              onClick={close}
            >
              <CloseIcon />
            </button>
          </div>
        </form>
      ) : (
        <button
          ref={openButton}
          type="button"
          aria-label={`Fijar fecha compromiso de ${ticket.key}`}
          disabled={mutation.isPending}
          className="btn-secondary h-8 px-2.5 text-xs"
          onClick={() => {
            mutation.reset();
            setEditing(true);
          }}
        >
          {mutation.isPending ? 'Guardando…' : 'Fijar fecha'}
        </button>
      )}
      {editing && errors.dueDate && (
        <p className="text-xs text-red-700">{errors.dueDate.message}</p>
      )}
      {mutation.isError && (
        <p role="alert" className="text-xs text-red-700">
          {errorMessage(mutation.error)}
        </p>
      )}
    </div>
  );
}
