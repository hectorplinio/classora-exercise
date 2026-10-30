import type { Pagination as PaginationData } from '../../api/generated/types.gen.ts';

type Props = {
  pagination: PaginationData;
  onChange: (offset: number) => void;
};

const button =
  'rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium ' +
  'hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50';

export function Pagination({ pagination: { offset, limit, totalElements }, onChange }: Props) {
  if (totalElements === 0) return null;

  // A page past the end (e.g. a shared link after tickets were closed): offer the first one.
  if (offset >= totalElements) {
    return (
      <nav aria-label="Paginación" className="flex items-center gap-3 text-sm">
        <p>Esta página no tiene tickets.</p>
        <button
          type="button"
          className={button}
          onClick={() => {
            onChange(0);
          }}
        >
          Ir a la primera página
        </button>
      </nav>
    );
  }

  const last = Math.min(offset + limit, totalElements);

  return (
    <nav aria-label="Paginación" className="flex items-center justify-between gap-3 text-sm">
      <p>
        Mostrando {offset + 1}–{last} de {totalElements}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          className={button}
          disabled={offset === 0}
          onClick={() => {
            onChange(Math.max(0, offset - limit));
          }}
        >
          Anterior
        </button>
        <button
          type="button"
          className={button}
          disabled={last >= totalElements}
          onClick={() => {
            onChange(offset + limit);
          }}
        >
          Siguiente
        </button>
      </div>
    </nav>
  );
}
