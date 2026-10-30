import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';

import { App } from './App.tsx';
import { apiUrl, currentUserHandler, problem } from './test/handlers.ts';
import { renderWithProviders } from './test/render.tsx';
import { server } from './test/server.ts';

const currentUser = () => screen.findByRole('region', { name: 'Usuario actual' });

test('starts as the Developer profile and shows its identity', async () => {
  server.use(currentUserHandler);
  renderWithProviders(<App />);

  const user = await currentUser();

  expect(screen.getByRole('combobox', { name: 'Perfil' })).toHaveValue('developer');
  expect(within(user).getByText('Payments')).toBeInTheDocument();
  expect(within(user).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
    'tickets.read',
  ]);
});

test('switching profile reloads the data with the new identity, without leftovers', async () => {
  server.use(currentUserHandler);
  renderWithProviders(<App />);
  await currentUser();

  await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Perfil' }), 'security');

  expect(screen.queryByText('Payments')).not.toBeInTheDocument();
  const user = await currentUser();
  expect(within(user).getByText('Security Champions')).toBeInTheDocument();
  expect(within(user).getByText('tickets.read.all')).toBeInTheDocument();
});

test('switching profile clears the cache of the previous one', async () => {
  server.use(currentUserHandler);
  const { queryClient } = renderWithProviders(<App />);
  await currentUser();

  await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Perfil' }), 'team-lead');
  await currentUser();

  expect(queryClient.getQueryCache().getAll().map((query) => query.queryKey)).toEqual([
    ['team-lead', 'current-user'],
  ]);
});

test('the chosen profile survives a reload', async () => {
  server.use(currentUserHandler);
  const { unmount } = renderWithProviders(<App />);
  await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Perfil' }), 'security');
  unmount();

  renderWithProviders(<App />);

  expect(screen.getByRole('combobox', { name: 'Perfil' })).toHaveValue('security');
});

test('a backend error is shown with its message', async () => {
  server.use(http.get(apiUrl('/me'), () => problem(403)));
  renderWithProviders(<App />);

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'No tienes permiso para realizar esta acción.',
  );
});
