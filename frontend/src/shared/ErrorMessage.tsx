import { errorMessage } from './errorMessages.ts';
import { AlertIcon } from './icons.tsx';

export function ErrorMessage({ error }: { error: unknown }) {
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800"
    >
      <AlertIcon />
      {errorMessage(error)}
    </p>
  );
}
