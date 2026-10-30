import { useProfile } from './ProfileContext.ts';
import { PROFILES } from './profiles.ts';

export function ProfileSelector() {
  const { profile, selectProfile } = useProfile();

  return (
    <label>
      Perfil{' '}
      <select
        value={profile.id}
        onChange={(event) => {
          selectProfile(event.target.value);
        }}
      >
        {PROFILES.map(({ id, label }) => (
          <option key={id} value={id}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}
