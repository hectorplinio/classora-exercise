import { useQueryClient } from '@tanstack/react-query';
import { type ReactNode, useCallback, useMemo, useState } from 'react';

import { ProfileContext } from './ProfileContext.ts';
import { DEFAULT_PROFILE, type Profile, findProfile } from './profiles.ts';

const STORAGE_KEY = 'mini-tickets.profile';

// The chosen profile survives a reload. Storage can be unavailable (private mode, blocked
// cookies): then the app simply starts with the default profile.
function readStoredProfile(): Profile {
  try {
    return findProfile(localStorage.getItem(STORAGE_KEY)) ?? DEFAULT_PROFILE;
  } catch {
    return DEFAULT_PROFILE;
  }
}

function storeProfile(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // Not persisted: the profile still applies to this session.
  }
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [profile, setProfile] = useState(readStoredProfile);

  const selectProfile = useCallback(
    (id: string) => {
      const next = findProfile(id);
      if (!next) return;
      // Query keys already include the profile; clearing also drops the previous profile's data
      // from memory, so nothing it could see survives the switch.
      queryClient.clear();
      storeProfile(next.id);
      setProfile(next);
    },
    [queryClient],
  );

  const value = useMemo(() => ({ profile, selectProfile }), [profile, selectProfile]);

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}
