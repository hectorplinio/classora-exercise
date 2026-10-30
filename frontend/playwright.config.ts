import { defineConfig, devices } from '@playwright/test';

// The end-to-end tests run the real backend and the real frontend, no mocks. They use their own
// ports so a running dev server is never reused: every run starts from the backend's fresh,
// in-memory seed, which makes the tests deterministic.
const BACKEND_PORT = 8100;
const FRONTEND_PORT = 5180;
// uvicorn listens on 127.0.0.1 by default: use it explicitly instead of depending on how
// `localhost` resolves.
const BACKEND_URL = `http://127.0.0.1:${String(BACKEND_PORT)}`;

export default defineConfig({
  testDir: './e2e',
  // One worker: the tests share one backend and one of them changes a ticket.
  workers: 1,
  forbidOnly: Boolean(process.env['CI']),
  retries: process.env['CI'] ? 1 : 0,
  reporter: process.env['CI'] ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${String(FRONTEND_PORT)}`,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: `uv run uvicorn tickets.main:create_app --factory --port ${String(BACKEND_PORT)}`,
      cwd: '../backend',
      url: `${BACKEND_URL}/openapi.json`,
      reuseExistingServer: false,
    },
    // The production build, served by `vite preview` (same `/api` proxy as the dev server).
    {
      command: `npx vite build && npx vite preview --port ${String(FRONTEND_PORT)} --strictPort`,
      url: `http://localhost:${String(FRONTEND_PORT)}`,
      env: { MINI_TICKETS_BACKEND_URL: BACKEND_URL },
      reuseExistingServer: false,
    },
  ],
});
