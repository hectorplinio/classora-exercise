import { defineConfig } from '@hey-api/openapi-ts';

// Types, Zod schemas and a typed fetch SDK generated from the contract (`npm run generate:api`).
// Never edit `src/api/generated` by hand: CI regenerates it and fails on any diff.
export default defineConfig({
  input: '../contract/openapi-rest.yml',
  output: 'src/api/generated',
  plugins: [
    // No base URL: requests stay same-origin (`/api/...`) and the Vite proxy forwards them.
    { name: '@hey-api/client-fetch', baseUrl: false },
    '@hey-api/typescript',
    'zod',
    {
      name: '@hey-api/sdk',
      // Every response is parsed with its Zod schema before reaching the app.
      validator: { request: false, response: 'zod' },
    },
  ],
});
