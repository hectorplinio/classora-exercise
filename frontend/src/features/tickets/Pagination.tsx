import type { Pagination as PaginationData } from '../../api/generated/types.gen.ts';
import { ChevronLeftIcon, ChevronRightIcon } from '../../shared/icons.tsx';

type Props = {
  pagination: PaginationData;
  onChange: (offset: number) => void;
};

export function Pagination({ pagination: { offset, limit, totalElements }, onChange }: Props) {
  if (totalElements === 0) return null;

  // A page past the end (e.g. a shared link after tickets were closed): offer the first one.
  if (offset >= totalElements) {
    return (
      <nav aria-label="Paginación" className="flex items-center justify-between gap-3 text-sm">
        <p className="text-zinc-600">Esta página no tiene tickets.</p>
        <button
          type="button"
          className="btn-secondary"
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
  const page = Math.floor(offset / limit) + 1;
  const pages = Math.ceil(totalElements / limit);

  return (
    <nav aria-label="Paginación" className="flex flex-wrap items-center justify-between gap-3 text-sm">
      <p className="text-zinc-600 tabular-nums">
        Mostrando {offset + 1}–{last} de {totalElements}
      </p>
      <div className="flex items-center gap-2">
        <span className="mr-1 text-zinc-500 tabular-nums" aria-hidden="true">
          {page} / {pages}
        </span>
        <button
          type="button"
          className="btn-secondary px-2.5"
          disabled={offset === 0}
          onClick={() => {
            onChange(Math.max(0, offset - limit));
          }}
        >
          <ChevronLeftIcon />
          Anterior
        </button>
        <button
          type="button"
          className="btn-secondary px-2.5"
          disabled={last >= totalElements}
          onClick={() => {
            onChange(offset + limit);
          }}
        >
          Siguiente
          <ChevronRightIcon />
        </button>
      </div>
    </nav>
  );
}
