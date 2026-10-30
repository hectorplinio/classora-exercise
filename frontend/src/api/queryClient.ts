import { QueryClient } from '@tanstack/react-query';

import { ApiError } from './client.ts';

const MAX_RETRIES = 2;

/** Client errors (4xx) are answers, not failures: retrying them would only repeat the answer. */
function shouldRetry(failureCount: number, error: Error): boolean {
  const isClientError = error instanceof ApiError && error.status >= 400 && error.status < 500;
  return !isClientError && failureCount < MAX_RETRIES;
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: shouldRetry },
    },
  });
}
