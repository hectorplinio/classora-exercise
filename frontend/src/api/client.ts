import type { Problem } from './generated/types.gen.ts';
import { zProblem } from './generated/zod.gen.ts';

/** A failed API call: the HTTP status (0 when the server could not be reached) and, when the
 * body follows the contract, its Problem Details. */
export class ApiError extends Error {
  readonly status: number;
  readonly problem: Problem | null;

  constructor(status: number, problem: Problem | null) {
    super(problem?.detail ?? `Request failed with status ${String(status)}`);
    this.name = 'ApiError';
    this.status = status;
    this.problem = problem;
  }
}

type SdkResult<T> = { data: T | undefined; error: unknown; response?: Response };

/** Returns the data of a successful SDK call, or throws an `ApiError` so TanStack Query treats
 * it as a failure. Successful bodies were already validated by the SDK with the contract's Zod
 * schema. */
export async function unwrap<T>(call: Promise<SdkResult<T>>): Promise<T> {
  const { data, error, response } = await call;
  if (response?.ok && data !== undefined) return data;
  const problem = zProblem.safeParse(error);
  throw new ApiError(response?.status ?? 0, problem.success ? problem.data : null);
}
