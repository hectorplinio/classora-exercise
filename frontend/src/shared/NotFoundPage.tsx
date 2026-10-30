import { Link } from 'react-router';

export function NotFoundPage() {
  return (
    <section aria-labelledby="not-found-title" className="flex flex-col items-start gap-2">
      <h2 id="not-found-title" className="text-xl font-semibold">
        No encontrado
      </h2>
      <p>La página no existe o no tienes acceso.</p>
      <Link to="/tickets" className="text-blue-700 underline">
        Volver al listado
      </Link>
    </section>
  );
}
