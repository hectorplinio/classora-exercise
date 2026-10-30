import { ApiError } from '../api/client.ts';

// UI text stays in Spanish, as in the statement.
const MESSAGES_BY_STATUS: Record<number, string> = {
  0: 'No se ha podido conectar con el servidor.',
  401: 'Falta la identidad del usuario.',
  403: 'No tienes permiso para realizar esta acción.',
  404: 'No encontrado.',
  409: 'La acción no es posible en el estado actual del ticket.',
  422: 'Hay datos no válidos.',
};

const UNEXPECTED = 'Ha ocurrido un error inesperado. Inténtalo de nuevo.';

/** The message shown to the user for a failed request. */
export function errorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return UNEXPECTED;
  return MESSAGES_BY_STATUS[error.status] ?? UNEXPECTED;
}
