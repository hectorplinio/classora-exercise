import { errorMessage } from './errorMessages.ts';

export function ErrorMessage({ error }: { error: unknown }) {
  return <p role="alert">{errorMessage(error)}</p>;
}
