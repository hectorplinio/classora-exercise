import { useCurrentUser } from './useCurrentUser.ts';

/**
 * Whether the backend says the caller has `permission` (from GET /me). Hiding an action with it
 * is only UX: the backend enforces every permission anyway (403).
 */
export function useHasPermission(permission: string): boolean {
  const { data } = useCurrentUser();
  return data?.permissions.includes(permission) ?? false;
}
