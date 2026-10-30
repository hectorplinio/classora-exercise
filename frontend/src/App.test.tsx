import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';

import { App } from './App.tsx';
import { apiUrl, currentUserHandler, problem, ticketsHandler } from './test/handlers.ts';
import { renderWithProviders } from './test/render.tsx';
import { server } from './test/server.ts';

const currentUser = () => screen.findByRole('group', { name: 'Usuario actual' });
const permissions = (user: HTMLElement) =>
  within(within(user).getByRole('list', { name: 'Permisos' }))
    .getAllByRole('listitem')
    .map((item) => item.textContent);

beforeEach(() => {
  server.use(currentUserHandler, ticketsHandler([]));
});

test('the root opens the ticket list', async () => {
  renderWithProviders(<App />, { route: '/' });

  expect(await screen.findByRole('heading', { name: 'Tickets' })).toBeInTheDocument();
});

test('an unknown page shows "not found"', () => {
  renderWithProviders(<App />, { route: '/nope' });

  expect(screen.getByRole('heading', { name: 'No encontrado' })).toBeInTheDocument();
});

test('starts as the Developer profile and shows its identity', async () => {
  renderWithProviders(<App />);

  const user = await currentUser();

  expect(screen.getByRole('combobox', { name: 'Perfil' })).toHaveValue('developer');
  expect(within(user).getByText('Payments')).toBeInTheDocument();
  expect(permissions(user)).toEqual(['tickets.read']);
});

test('switching profile reloads the data with the new identity, without leftovers', async () => {
  renderWithProviders(<App />);
  await currentUser();

  await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Perfil' }), 'security');

  expect(screen.queryByText('Payments')).not.toBeInTheDocument();
  const user = await currentUser();
  expect(within(user).getByText('Security Champions')).toBeInTheDocument();
  expect(permissions(user)).toContain('tickets.read.all');
});

test('switching profile clears the cache of the previous one', async () => {
  const { queryClient } = renderWithProviders(<App />, { route: '/nope' });
  await currentUser();

  await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Perfil' }), 'team-lead');
  await currentUser();

  expect(queryClient.getQueryCache().getAll().map((query) => query.queryKey)).toEqual([
    ['team-lead', 'current-user'],
  ]);
});

test('the chosen profile survives a reload', async () => {
  const { unmount } = renderWithProviders(<App />);
  await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Perfil' }), 'security');
  unmount();

  renderWithProviders(<App />);

  expect(screen.getByRole('combobox', { name: 'Perfil' })).toHaveValue('security');
});

test('a backend error is shown with its message', async () => {
  server.use(http.get(apiUrl('/me'), () => problem(403)));
  renderWithProviders(<App />, { route: '/nope' });

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'No tienes permiso para realizar esta acción.',
  );
});
