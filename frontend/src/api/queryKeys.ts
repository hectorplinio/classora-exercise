/** Every key starts with the profile: data fetched with one identity is never served to another. */
export const queryKeys = {
  currentUser: (profileId: string) => [profileId, 'current-user'] as const,
  ticketLists: (profileId: string) => [profileId, 'tickets'] as const,
  tickets: (profileId: string, params: object) => [profileId, 'tickets', params] as const,
  ticket: (profileId: string, id: string) => [profileId, 'ticket', id] as const,
};
