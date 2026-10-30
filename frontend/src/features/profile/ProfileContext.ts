import { createContext, useContext } from 'react';

import type { Profile } from './profiles.ts';

export type ProfileContextValue = {
  profile: Profile;
  selectProfile: (id: string) => void;
};

export const ProfileContext = createContext<ProfileContextValue | null>(null);

export function useProfile(): ProfileContextValue {
  const value = useContext(ProfileContext);
  if (!value) throw new Error('useProfile must be used inside <ProfileProvider>');
  return value;
}
