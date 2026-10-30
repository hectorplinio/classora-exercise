import { useQuery } from '@tanstack/react-query';

import { unwrap } from '../../api/client.ts';
import { getCurrentUser } from '../../api/generated/sdk.gen.ts';
import { identityHeaders } from '../../api/identity.ts';
import { queryKeys } from '../../api/queryKeys.ts';
import { useProfile } from '../profile/ProfileContext.ts';

export function useCurrentUser() {
  const { profile } = useProfile();

  return useQuery({
    queryKey: queryKeys.currentUser(profile.id),
    queryFn: () => unwrap(getCurrentUser({ headers: identityHeaders(profile) })),
  });
}
