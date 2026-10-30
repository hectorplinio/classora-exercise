import { useMutation, useQueryClient } from '@tanstack/react-query';

import { unwrap } from '../../api/client.ts';
import { setTicketDueDate } from '../../api/generated/sdk.gen.ts';
import { identityHeaders } from '../../api/identity.ts';
import { queryKeys } from '../../api/queryKeys.ts';
import { useProfile } from '../profile/ProfileContext.ts';

/**
 * Sets the due date of a ticket. The updated ticket answered by the server replaces the cached
 * detail, and every cached list of the profile is invalidated: the new state or date can change
 * which tickets match a filter and in which order.
 */
export function useSetDueDate(id: string) {
  const { profile } = useProfile();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dueDate: string) =>
      unwrap(
        setTicketDueDate({ path: { id }, body: { dueDate }, headers: identityHeaders(profile) }),
      ),
    onSuccess: async (ticket) => {
      queryClient.setQueryData(queryKeys.ticket(profile.id, id), ticket);
      await queryClient.invalidateQueries({ queryKey: queryKeys.ticketLists(profile.id) });
    },
  });
}
