import { http, HttpResponse } from 'msw';

import type { Problem, Ticket } from '../api/generated/types.gen.ts';

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

/** A page of `tickets` with the given offset and limit, as the backend returns it. */
export function ticketPage(tickets: readonly Ticket[], offset = 0, limit = 20) {
  return {
    data: tickets.slice(offset, offset + limit),
    pagination: { offset, limit, totalElements: tickets.length },
  };
}

/** GET /tickets answering with `tickets`, paginated with the request's offset and limit. */
export function ticketsHandler(tickets: readonly Ticket[], onRequest?: (url: URL) => void) {
  return http.get(apiUrl('/tickets'), ({ request }) => {
    const url = new URL(request.url);
    onRequest?.(url);
    const offset = Number(url.searchParams.get('offset') ?? 0);
    const limit = Number(url.searchParams.get('limit') ?? 20);
    return HttpResponse.json(ticketPage(tickets, offset, limit));
  });
}
