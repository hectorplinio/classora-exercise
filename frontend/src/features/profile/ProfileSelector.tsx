import { useProfile } from './ProfileContext.ts';
import { PROFILES } from './profiles.ts';

export function ProfileSelector() {
  const { profile, selectProfile } = useProfile();

  return (
    <label className="flex items-center gap-2 text-sm">
      Perfil
      <select
        className="rounded-md border border-slate-600 bg-slate-800 px-2 py-1"
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
