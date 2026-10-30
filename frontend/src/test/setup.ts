import '../api/zodConfig.ts';
import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';

import { client } from '../api/generated/client.gen.ts';
import { server } from './server.ts';

// In the browser requests are relative (same origin, Vite proxy); in Node they need an origin.
client.setConfig({ baseUrl: window.location.origin });

beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' });
});
afterEach(() => {
  server.resetHandlers();
  cleanup();
  localStorage.clear();
});
afterAll(() => {
  server.close();
});
