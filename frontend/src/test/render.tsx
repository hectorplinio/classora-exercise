import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';

import { ProfileProvider } from '../features/profile/ProfileProvider.tsx';

/** Renders with the app providers and a fresh cache; failed queries are not retried. */
export function renderWithProviders(ui: ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <ProfileProvider>{ui}</ProfileProvider>
      </QueryClientProvider>,
    ),
  };
}
