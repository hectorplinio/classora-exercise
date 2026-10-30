import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router';

import { ProfileProvider } from '../features/profile/ProfileProvider.tsx';

/** Renders with the app providers, a fresh cache (no retries) and the router at `route`. */
export function renderWithProviders(ui: ReactElement, { route = '/' }: { route?: string } = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <ProfileProvider>
          <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
        </ProfileProvider>
      </QueryClientProvider>,
    ),
  };
}
