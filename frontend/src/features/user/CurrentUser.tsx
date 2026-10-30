import { ErrorMessage } from '../../shared/ErrorMessage.tsx';
import { useCurrentUser } from './useCurrentUser.ts';

/** Who the backend says the caller is (GET /me), next to the profile selector. */
export function CurrentUser() {
  const { data, error, isPending } = useCurrentUser();

  if (isPending) return <span className="h-5 w-40 animate-pulse rounded bg-zinc-100" />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <div role="group" aria-label="Usuario actual" className="flex flex-wrap items-center gap-2 text-sm">
      <span className="font-medium text-zinc-900">{data.team}</span>
      <ul aria-label="Permisos" className="flex flex-wrap gap-1">
        {data.permissions.map((permission) => (
          <li
            key={permission}
            className="rounded-md border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 font-mono text-[11px] text-zinc-600"
          >
            {permission}
          </li>
        ))}
      </ul>
    </div>
  );
}
