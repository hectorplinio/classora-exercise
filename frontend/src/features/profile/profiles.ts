import type { Identity } from '../../api/identity.ts';

export type Profile = Identity & {
  id: string;
  label: string;
};

/** The predefined profiles of the statement. */
export const PROFILES = [
  { id: 'developer', label: 'Developer', team: 'Payments', permissions: ['tickets.read'] },
  {
    id: 'team-lead',
    label: 'Team lead',
    team: 'Payments',
    permissions: ['tickets.read', 'tickets.update'],
  },
  {
    id: 'security',
    label: 'Security',
    team: 'Security Champions',
    permissions: ['tickets.read', 'tickets.update', 'tickets.read.all'],
  },
] as const satisfies readonly Profile[];

export type ProfileId = (typeof PROFILES)[number]['id'];

export const DEFAULT_PROFILE: Profile = PROFILES[0];

export function findProfile(id: string | null): Profile | undefined {
  return PROFILES.find((profile) => profile.id === id);
}
