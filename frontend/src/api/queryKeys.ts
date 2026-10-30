/** Every key starts with the profile: data fetched with one identity is never served to another. */
export const queryKeys = {
  currentUser: (profileId: string) => [profileId, 'current-user'] as const,
};
