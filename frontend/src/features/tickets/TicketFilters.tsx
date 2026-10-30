import { DebouncedInput } from './DebouncedInput.tsx';
import { SEVERITY_LABELS, STATE_LABELS } from './labels.ts';
import { SEVERITIES, TICKET_STATES, type TicketListParams } from './ticketListParams.ts';
import type { TicketListFilters } from './useTicketListParams.ts';

type Props = {
  params: TicketListParams;
  onChange: (patch: TicketListFilters) => void;
  onReset: () => void;
};

const input =
  'w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm shadow-xs ' +
  'placeholder:text-slate-400';

export function TicketFilters({ params, onChange, onReset }: Props) {
  return (
    <form
      role="search"
      aria-label="Filtros"
      className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-2 lg:grid-cols-4"
      onSubmit={(event) => {
        event.preventDefault();
      }}
    >
      <label className="flex flex-col gap-1 text-sm font-medium lg:col-span-2">
        Buscar
        <DebouncedInput
          type="search"
          className={input}
          placeholder="Clave, título o activo"
          maxLength={256}
          value={params.q}
          onChange={(q) => {
            onChange({ q });
          }}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium">
        Equipo asignado
        <DebouncedInput
          className={input}
          placeholder="Cualquiera"
          maxLength={100}
          value={params.assignedTeam}
          onChange={(assignedTeam) => {
            onChange({ assignedTeam });
          }}
        />
      </label>

      <label className="flex items-center gap-2 self-end text-sm font-medium">
        <input
          type="checkbox"
          className="size-4"
          checked={params.expiredOnly}
          onChange={(event) => {
            onChange({ expiredOnly: event.target.checked });
          }}
        />
        Solo caducados
      </label>

      <CheckboxGroup
        legend="Estado"
        options={TICKET_STATES}
        labels={STATE_LABELS}
        selected={params.state}
        onChange={(state) => {
          onChange({ state });
        }}
      />
      <CheckboxGroup
        legend="Severidad"
        options={SEVERITIES}
        labels={SEVERITY_LABELS}
        selected={params.severity}
        onChange={(severity) => {
          onChange({ severity });
        }}
      />

      <div className="flex items-end lg:col-span-2 lg:justify-end">
        <button
          type="button"
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-slate-100"
          onClick={onReset}
        >
          Limpiar filtros
        </button>
      </div>
    </form>
  );
}

type CheckboxGroupProps<T extends string> = {
  legend: string;
  options: readonly T[];
  labels: Record<T, string>;
  selected: readonly T[];
  onChange: (selected: T[]) => void;
};

/** At least one option stays selected: the last one cannot be unchecked. */
function CheckboxGroup<T extends string>({
  legend,
  options,
  labels,
  selected,
  onChange,
}: CheckboxGroupProps<T>) {
  return (
    <fieldset className="flex flex-col gap-1 text-sm">
      <legend className="mb-1 font-medium">{legend}</legend>
      {options.map((option) => {
        const checked = selected.includes(option);
        return (
          <label key={option} className="flex items-center gap-2">
            <input
              type="checkbox"
              className="size-4"
              checked={checked}
              disabled={checked && selected.length === 1}
              onChange={() => {
                onChange(
                  options.filter((o) => (o === option ? !checked : selected.includes(o))),
                );
              }}
            />
            {labels[option]}
          </label>
        );
      })}
    </fieldset>
  );
}
