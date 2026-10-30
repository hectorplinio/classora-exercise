import { ErrorMessage } from '../../shared/ErrorMessage.tsx';
import { useCurrentUser } from './useCurrentUser.ts';

/** Who the backend says the caller is (GET /me), next to the profile selector. */
export function CurrentUser() {
  const { data, error, isPending } = useCurrentUser();

  if (isPending) return <p className="text-sm text-slate-300">Cargando…</p>;
  if (error) return <ErrorMessage error={error} />;

  return (
    <div role="group" aria-label="Usuario actual" className="flex flex-wrap items-center gap-2 text-sm">
      <span className="font-medium">{data.team}</span>
      <ul aria-label="Permisos" className="flex flex-wrap gap-1">
        {data.permissions.map((permission) => (
          <li key={permission} className="rounded bg-slate-700 px-1.5 py-0.5 font-mono text-xs">
            {permission}
          </li>
        ))}
      </ul>
    </div>
  );
}
