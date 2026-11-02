import { useCurrentUser } from './useCurrentUser.ts';

/**
 * Whether the backend says the caller has `permission` (from GET /me), or `undefined` while that
 * is not known yet. Hiding an action with it is only UX: the backend enforces every permission
 * anyway (403).
 */
export function useHasPermission(permission: string): boolean | undefined {
  const { data } = useCurrentUser();
  return data?.permissions.includes(permission);
}
