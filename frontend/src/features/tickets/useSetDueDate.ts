import { type QueryClient, useMutation, useQueryClient } from '@tanstack/react-query';

import { unwrap } from '../../api/client.ts';
import { setTicketDueDate } from '../../api/generated/sdk.gen.ts';
import type { Ticket, TicketPage } from '../../api/generated/types.gen.ts';
import { identityHeaders } from '../../api/identity.ts';
import { queryKeys } from '../../api/queryKeys.ts';
import { useProfile } from '../profile/ProfileContext.ts';

/** What the server will do (statement): set the date and move REPORTED to IN_PROGRESS. */
export function withDueDate(ticket: Ticket, dueDate: string): Ticket {
  const state = ticket.state === 'REPORTED' ? 'IN_PROGRESS' : ticket.state;
  return { ...ticket, dueDate, state };
}

type Snapshot = [readonly unknown[], unknown][];

/**
 * Sets the due date of a ticket, optimistically: the detail and every cached list or page that
 * contains the ticket show the new date (and "En curso") at once. If the server fails, every
 * cache goes back to what it was and the error is returned to the caller. When the request ends
 * the lists are invalidated: the server decides whether the ticket still matches each filter and
 * where it goes in each order, so a row that no longer matches stays, updated, until then.
 */
export function useSetDueDate(id: string) {
  const { profile } = useProfile();
  const queryClient = useQueryClient();
  const ticketKey = queryKeys.ticket(profile.id, id);
  const listsKey = queryKeys.ticketLists(profile.id);

  return useMutation({
    mutationFn: (dueDate: string) =>
      unwrap(
        setTicketDueDate({ path: { id }, body: { dueDate }, headers: identityHeaders(profile) }),
      ),
    onMutate: async (dueDate): Promise<Snapshot> => {
      // A response in flight must not overwrite the optimistic data.
      await queryClient.cancelQueries({ queryKey: ticketKey });
      await queryClient.cancelQueries({ queryKey: listsKey });
      const snapshot = takeSnapshot(queryClient, ticketKey, listsKey);

      queryClient.setQueryData<Ticket>(ticketKey, (ticket) => ticket && withDueDate(ticket, dueDate));
      queryClient.setQueriesData<TicketPage>({ queryKey: listsKey }, (page) =>
        page
          ? {
              ...page,
              data: page.data.map((ticket) =>
                ticket.id === id ? withDueDate(ticket, dueDate) : ticket,
              ),
            }
          : page,
      );
      return snapshot;
    },
    onError: (_error, _dueDate, snapshot) => {
      // The snapshot is only missing if onMutate threw, which it cannot.
      /* v8 ignore next -- @preserve */
      for (const [key, data] of snapshot ?? []) queryClient.setQueryData(key, data);
    },
    onSuccess: (ticket) => {
      queryClient.setQueryData(ticketKey, ticket);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: listsKey }),
  });
}

function takeSnapshot(
  queryClient: QueryClient,
  ticketKey: readonly unknown[],
  listsKey: readonly unknown[],
): Snapshot {
  return [
    [ticketKey, queryClient.getQueryData(ticketKey)],
    ...queryClient.getQueriesData({ queryKey: listsKey }),
  ];
}
