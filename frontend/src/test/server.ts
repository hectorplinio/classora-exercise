import { setupServer } from 'msw/node';

// MSW intercepts every request in tests; each test declares the responses it needs with
// `server.use(...)`. Requests without a handler fail the test (see setup.ts).
export const server = setupServer();
