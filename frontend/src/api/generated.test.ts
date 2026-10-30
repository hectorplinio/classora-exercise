import { http, HttpResponse } from 'msw';

import { client } from './generated/client.gen.ts';
import { getCurrentUser } from './generated/sdk.gen.ts';
import { server } from '../test/server.ts';

// The generated SDK validates every response with the contract's Zod schema: data that does not
// match the contract never reaches the app.
beforeAll(() => {
  client.setConfig({ baseUrl: 'http://localhost' });
});

test('a response that matches the contract is returned typed', async () => {
  server.use(
    http.get('http://localhost/api/v1/me', () =>
      HttpResponse.json({ team: 'Payments', permissions: ['tickets.read'] }),
    ),
  );

  const { data } = await getCurrentUser({ throwOnError: true });

  expect(data).toEqual({ team: 'Payments', permissions: ['tickets.read'] });
});

test('a response that breaks the contract is rejected', async () => {
  server.use(
    http.get('http://localhost/api/v1/me', () =>
      HttpResponse.json({ team: 'Payments', permissions: 'tickets.read' }),
    ),
  );

  await expect(getCurrentUser({ throwOnError: true })).rejects.toThrow();
});
