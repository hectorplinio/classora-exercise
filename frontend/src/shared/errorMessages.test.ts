import { ApiError } from '../api/client.ts';
import { errorMessage } from './errorMessages.ts';

test.each([
  [403, 'No tienes permiso para realizar esta acción.'],
  [404, 'No encontrado.'],
  [409, 'La acción no es posible en el estado actual del ticket.'],
  [422, 'Hay datos no válidos.'],
  [401, 'Falta la identidad del usuario.'],
  [0, 'No se ha podido conectar con el servidor.'],
])('a %i has its own message', (status, message) => {
  expect(errorMessage(new ApiError(status, null))).toBe(message);
});

test.each([new ApiError(500, null), new Error('boom'), 'boom'])(
  'anything else is an unexpected error',
  (error) => {
    expect(errorMessage(error)).toBe('Ha ocurrido un error inesperado. Inténtalo de nuevo.');
  },
);
