import { ResetIcon, SearchIcon } from '../../shared/icons.tsx';
import { DebouncedInput } from './DebouncedInput.tsx';
import { SEVERITY_LABELS, STATE_LABELS } from './labels.ts';
import { SEVERITY_DOT_CLASSES } from './severityColors.ts';
import { SEVERITIES, TICKET_STATES, type TicketListParams } from './ticketListParams.ts';
import type { TicketListFilters } from './useTicketListParams.ts';

type Props = {
  params: TicketListParams;
  onChange: (patch: TicketListFilters) => void;
  onReset: () => void;
};

export function TicketFilters({ params, onChange, onReset }: Props) {
  return (
    <form
      role="search"
      aria-label="Filtros"
      className="card flex flex-col gap-4 p-4"
      onSubmit={(event) => {
        event.preventDefault();
      }}
    >
      <div className="grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto_auto] md:items-end">
        <label className="flex flex-col gap-1.5">
          <span className="label">Buscar</span>
          <span className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-zinc-400">
              <SearchIcon />
            </span>
            <DebouncedInput
              type="search"
              className="field pl-9"
              placeholder="Clave, título o activo"
              maxLength={256}
              value={params.q}
              onChange={(q) => {
                onChange({ q });
              }}
            />
          </span>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="label">Equipo asignado</span>
          <DebouncedInput
            className="field"
            placeholder="Cualquiera"
            maxLength={100}
            value={params.assignedTeam}
            onChange={(assignedTeam) => {
              onChange({ assignedTeam });
            }}
          />
        </label>

        <label className="flex h-9 cursor-pointer items-center gap-2 text-sm font-medium text-zinc-700">
          <input
            type="checkbox"
            className="size-4 accent-zinc-900"
            checked={params.expiredOnly}
            onChange={(event) => {
              onChange({ expiredOnly: event.target.checked });
            }}
          />
          Solo caducados
        </label>

        <button type="button" className="btn-secondary" onClick={onReset}>
          <ResetIcon />
          Limpiar filtros
        </button>
      </div>

      <div className="flex flex-col gap-3 border-t border-zinc-100 pt-4 lg:flex-row lg:gap-8">
        <ChipGroup
          legend="Estado"
          options={TICKET_STATES}
          labels={STATE_LABELS}
          selected={params.state}
          onChange={(state) => {
            onChange({ state });
          }}
        />
        <ChipGroup
          legend="Severidad"
          options={SEVERITIES}
          labels={SEVERITY_LABELS}
          selected={params.severity}
          dot={(severity) => SEVERITY_DOT_CLASSES[severity]}
          onChange={(severity) => {
            onChange({ severity });
          }}
        />
      </div>
    </form>
  );
}

type ChipGroupProps<T extends string> = {
  legend: string;
  options: readonly T[];
  labels: Record<T, string>;
  selected: readonly T[];
  onChange: (selected: T[]) => void;
  dot?: (option: T) => string;
};

/**
 * Real checkboxes styled as chips: keyboard and screen readers work as with any checkbox. At
 * least one option stays selected: the last one cannot be unchecked.
 */
function ChipGroup<T extends string>({
  legend,
  options,
  labels,
  selected,
  onChange,
  dot,
}: ChipGroupProps<T>) {
  return (
    <fieldset className="flex flex-wrap items-center gap-2">
      <legend className="label float-left mr-1 w-20">{legend}</legend>
      {options.map((option) => {
        const checked = selected.includes(option);
        return (
          <label
            key={option}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-sm text-zinc-400 transition-colors select-none hover:border-zinc-300 has-checked:border-zinc-800 has-checked:bg-white has-checked:text-zinc-900 has-disabled:cursor-not-allowed has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-zinc-900"
          >
            <input
              type="checkbox"
              className="sr-only"
              checked={checked}
              disabled={checked && selected.length === 1}
              onChange={() => {
                onChange(options.filter((o) => (o === option ? !checked : selected.includes(o))));
              }}
            />
            {dot ? (
              <span
                aria-hidden="true"
                className={`size-2 rounded-full ${dot(option)} ${checked ? '' : 'opacity-40'}`}
              />
            ) : (
              <span aria-hidden="true" className={checked ? 'text-zinc-900' : 'text-zinc-300'}>
                {checked ? '✓' : '·'}
              </span>
            )}
            {labels[option]}
          </label>
        );
      })}
    </fieldset>
  );
}
