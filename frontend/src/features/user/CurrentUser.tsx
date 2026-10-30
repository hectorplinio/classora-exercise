import { ErrorMessage } from '../../shared/ErrorMessage.tsx';
import { useCurrentUser } from './useCurrentUser.ts';

export function CurrentUser() {
  const { data, error, isPending } = useCurrentUser();

  if (isPending) return <p>Cargando…</p>;
  if (error) return <ErrorMessage error={error} />;

  return (
    <section aria-labelledby="current-user-title">
      <h2 id="current-user-title">Usuario actual</h2>
      <dl>
        <dt>Equipo</dt>
        <dd>{data.team}</dd>
        <dt>Permisos</dt>
        <dd>
          <ul>
            {data.permissions.map((permission) => (
              <li key={permission}>{permission}</li>
            ))}
          </ul>
        </dd>
      </dl>
    </section>
  );
}
