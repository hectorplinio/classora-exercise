import { ApiError } from './client.ts';
import { createQueryClient } from './queryClient.ts';

const retry = createQueryClient().getDefaultOptions().queries?.retry;
const shouldRetry = (failureCount: number, error: Error) => {
  if (typeof retry !== 'function') throw new Error('Expected a retry function');
  return retry(failureCount, error);
};

test.each([401, 403, 404, 409, 422])('does not retry a %i', (status) => {
  expect(shouldRetry(0, new ApiError(status, null))).toBe(false);
});

test('retries server and network errors a limited number of times', () => {
  expect(shouldRetry(0, new ApiError(503, null))).toBe(true);
  expect(shouldRetry(1, new ApiError(0, null))).toBe(true);
  expect(shouldRetry(2, new ApiError(503, null))).toBe(false);
});
