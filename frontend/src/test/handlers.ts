import { http, HttpResponse } from 'msw';

import type { Problem } from '../api/generated/types.gen.ts';

export const apiUrl = (path: string) => new URL(`/api/v1${path}`, window.location.origin).href;

/** GET /me answering like the backend: the identity comes from the request headers. */
export const currentUserHandler = http.get(apiUrl('/me'), ({ request }) => {
  const team = request.headers.get('X-User-Team');
  if (!team) return problem(401);
  const permissions = request.headers.get('X-User-Permissions')?.split(',') ?? [];
  return HttpResponse.json({ team, permissions });
});

export function problem(status: number, extra: Partial<Problem> = {}) {
  return HttpResponse.json(
    { type: 'about:blank', title: 'Error', status, ...extra },
    { status, headers: { 'Content-Type': 'application/problem+json' } },
  );
}
