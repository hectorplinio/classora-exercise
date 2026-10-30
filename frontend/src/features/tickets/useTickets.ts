import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { unwrap } from '../../api/client.ts';
import { searchTickets } from '../../api/generated/sdk.gen.ts';
import { identityHeaders } from '../../api/identity.ts';
import { queryKeys } from '../../api/queryKeys.ts';
import { useProfile } from '../profile/ProfileContext.ts';
import type { TicketListParams } from './ticketListParams.ts';

export function useTickets(params: TicketListParams) {
  const { profile } = useProfile();

  return useQuery({
    queryKey: queryKeys.tickets(profile.id, params),
    queryFn: () =>
      unwrap(
        searchTickets({
          query: { ...params, state: [...params.state], severity: [...params.severity] },
          headers: identityHeaders(profile),
        }),
      ),
    // While the next page or filter loads, keep showing the current rows instead of a blank
    // table, but never another profile's rows.
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[0] === profile.id ? keepPreviousData(previous) : undefined,
  });
}
