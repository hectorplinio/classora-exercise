import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import type { ReactNode } from 'react';

import type { Ticket } from '../../api/generated/types.gen.ts';
import { aTicket } from '../../test/builders.ts';
import { apiUrl } from '../../test/handlers.ts';
import { server } from '../../test/server.ts';
import { ProfileProvider } from '../profile/ProfileProvider.tsx';
import { useSetDueDate, withDueDate } from './useSetDueDate.ts';

test('a REPORTED ticket moves to IN_PROGRESS', () => {
  expect(withDueDate(aTicket({ state: 'REPORTED' }), '2099-01-15')).toMatchObject({
    state: 'IN_PROGRESS',
    dueDate: '2099-01-15',
  });
});

test.each(['IN_PROGRESS', 'PENDING_SECURITY'] as const)('a %s ticket keeps its state', (state) => {
  expect(withDueDate(aTicket({ state }), '2099-01-15').state).toBe(state);
});

describe('useSetDueDate', () => {
  function renderSetDueDate(ticket: Ticket) {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <ProfileProvider>{children}</ProfileProvider>
      </QueryClientProvider>
    );
    const { result } = renderHook(() => useSetDueDate(ticket.id), { wrapper });
    return { result, queryClient };
  }

  test('works when neither the detail nor any list is cached yet', async () => {
    const ticket = aTicket({ state: 'REPORTED' });
    server.use(
      http.patch(apiUrl(`/tickets/${ticket.id}`), () =>
        HttpResponse.json(withDueDate(ticket, '2099-01-15')),
      ),
    );
    const { result, queryClient } = renderSetDueDate(ticket);
    // A list that is still loading has no data to update.
    queryClient.getQueryCache().build(queryClient, { queryKey: ['developer', 'tickets', {}] });

    await act(() => result.current.mutateAsync('2099-01-15'));

    expect(queryClient.getQueryData(['developer', 'ticket', ticket.id])).toMatchObject({
      state: 'IN_PROGRESS',
    });
  });
});
