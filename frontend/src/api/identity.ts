/** The simulated identity the backend reads from every request (see the contract). */
export type Identity = {
  team: string;
  permissions: readonly string[];
};

export function identityHeaders(identity: Identity): Record<string, string> {
  return {
    'X-User-Team': identity.team,
    'X-User-Permissions': identity.permissions.join(','),
  };
}
