import { http, HttpResponse } from 'msw';

import { ApiError, unwrap } from './client.ts';
import { getCurrentUser } from './generated/sdk.gen.ts';
import { apiUrl, problem } from '../test/handlers.ts';
import { server } from '../test/server.ts';

async function failure(): Promise<ApiError> {
  const error: unknown = await unwrap(getCurrentUser()).catch((e: unknown) => e);
  if (!(error instanceof ApiError)) throw new Error('Expected an ApiError');
  return error;
}

test('returns the data of a successful call', async () => {
  server.use(
    http.get(apiUrl('/me'), () => HttpResponse.json({ team: 'Payments', permissions: [] })),
  );

  await expect(unwrap(getCurrentUser())).resolves.toEqual({ team: 'Payments', permissions: [] });
});

test('a Problem Details error becomes an ApiError with its status and problem', async () => {
  server.use(
    http.get(apiUrl('/me'), () =>
      problem(422, { detail: 'Invalid date.', invalidParams: [{ name: 'dueDate', reason: 'x' }] }),
    ),
  );

  const error = await failure();

  expect(error.status).toBe(422);
  expect(error.problem?.invalidParams).toEqual([{ name: 'dueDate', reason: 'x' }]);
  expect(error.message).toBe('Invalid date.');
});

test('an error body that is not Problem Details keeps the status without a problem', async () => {
  server.use(http.get(apiUrl('/me'), () => new HttpResponse('Bad gateway', { status: 502 })));

  const error = await failure();

  expect(error.status).toBe(502);
  expect(error.problem).toBeNull();
});

test('an unreachable server is status 0', async () => {
  server.use(http.get(apiUrl('/me'), () => HttpResponse.error()));

  const error = await failure();

  expect(error.status).toBe(0);
});
