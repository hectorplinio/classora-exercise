import { errorMessage } from './errorMessages.ts';

export function ErrorMessage({ error }: { error: unknown }) {
  return (
    <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-800">
      {errorMessage(error)}
    </p>
  );
}
