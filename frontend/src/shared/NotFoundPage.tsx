import { Link } from 'react-router';

import { ArrowLeftIcon } from './icons.tsx';

export function NotFoundPage() {
  return (
    <section
      aria-labelledby="not-found-title"
      className="mx-auto flex max-w-md flex-col items-center gap-3 py-20 text-center"
    >
      <p className="font-mono text-sm text-zinc-400">404</p>
      <h2 id="not-found-title" className="text-2xl font-semibold tracking-tight">
        No encontrado
      </h2>
      <p className="text-zinc-600">La página no existe o no tienes acceso.</p>
      <Link to="/tickets" className="btn-secondary mt-2">
        <ArrowLeftIcon />
        Volver al listado
      </Link>
    </section>
  );
}
