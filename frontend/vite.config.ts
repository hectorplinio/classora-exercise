/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// In development the browser only talks to Vite: `/api` is proxied to the backend, so requests
// are same-origin and the backend needs no CORS configuration.
const backendUrl = process.env['MINI_TICKETS_BACKEND_URL'] ?? 'http://localhost:8000';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': backendUrl,
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      include: ['src/**'],
      // Generated code, test helpers and the bootstrap (covered by the e2e tests) are not measured.
      exclude: ['src/api/generated/**', 'src/test/**', 'src/**/*.test.*', 'src/main.tsx'],
      thresholds: { 100: true },
    },
  },
});
