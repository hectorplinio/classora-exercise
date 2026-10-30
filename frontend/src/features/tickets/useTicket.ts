import { useQuery } from '@tanstack/react-query';

import { unwrap } from '../../api/client.ts';
import { getTicket } from '../../api/generated/sdk.gen.ts';
import { identityHeaders } from '../../api/identity.ts';
import { queryKeys } from '../../api/queryKeys.ts';
import { useProfile } from '../profile/ProfileContext.ts';

export function useTicket(id: string) {
  const { profile } = useProfile();

  return useQuery({
    queryKey: queryKeys.ticket(profile.id, id),
    queryFn: () => unwrap(getTicket({ path: { id }, headers: identityHeaders(profile) })),
  });
}
