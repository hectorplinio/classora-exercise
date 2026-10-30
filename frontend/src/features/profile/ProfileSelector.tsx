import { ChevronDownIcon } from '../../shared/icons.tsx';
import { useProfile } from './ProfileContext.ts';
import { PROFILES } from './profiles.ts';

export function ProfileSelector() {
  const { profile, selectProfile } = useProfile();

  return (
    <label className="flex items-center gap-2">
      <span className="label">Perfil</span>
      <span className="relative">
        <select
          className="field h-8 w-auto cursor-pointer appearance-none pr-8 font-medium"
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
        <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-zinc-500">
          <ChevronDownIcon />
        </span>
      </span>
    </label>
  );
}
