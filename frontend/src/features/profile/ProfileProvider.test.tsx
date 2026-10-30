import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import userEvent from '@testing-library/user-event';

import { App } from '../../App.tsx';
import { currentUserHandler, ticketsHandler } from '../../test/handlers.ts';
import { renderWithProviders } from '../../test/render.tsx';
import { server } from '../../test/server.ts';
import { useProfile } from './ProfileContext.ts';
import { ProfileProvider } from './ProfileProvider.tsx';

beforeEach(() => {
  server.use(currentUserHandler, ticketsHandler([]));
});

test('without storage the app starts with the default profile and can still switch', async () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('SecurityError');
  });
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('SecurityError');
  });
  renderWithProviders(<App />);
  const selector = screen.getByRole('combobox', { name: 'Perfil' });
  expect(selector).toHaveValue('developer');

  await userEvent.selectOptions(selector, 'security');

  expect(selector).toHaveValue('security');
});

test('an unknown stored profile falls back to the default one', () => {
  localStorage.setItem('mini-tickets.profile', 'admin');
  renderWithProviders(<App />);

  expect(screen.getByRole('combobox', { name: 'Perfil' })).toHaveValue('developer');
});

test('useProfile outside its provider is a programming error', () => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);

  expect(() => renderHook(() => useProfile())).toThrow('useProfile must be used inside');
});

test('selecting an unknown profile keeps the current one', () => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={new QueryClient()}>
      <ProfileProvider>{children}</ProfileProvider>
    </QueryClientProvider>
  );
  const { result } = renderHook(() => useProfile(), { wrapper });

  act(() => {
    result.current.selectProfile('admin');
  });

  expect(result.current.profile.id).toBe('developer');
});

test('re-selecting the current profile keeps its data', async () => {
  const { queryClient } = renderWithProviders(<App />, { route: '/nope' });
  await screen.findByRole('group', { name: 'Usuario actual' });

  await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Perfil' }), 'developer');

  expect(screen.getByRole('group', { name: 'Usuario actual' })).toHaveTextContent('Payments');
  expect(queryClient.getQueryCache().getAll()).toHaveLength(1);
});
