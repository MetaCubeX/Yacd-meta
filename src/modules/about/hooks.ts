import { useSuspenseQuery } from '@tanstack/react-query';

import { fetchVersion } from '~/api/version';
import { ClashAPIConfig } from '~/types';

export function useAboutVersionQuery(apiConfig: ClashAPIConfig) {
  return useSuspenseQuery({
    queryKey: ['/version', apiConfig],
    queryFn: () => fetchVersion('/version', apiConfig),
  });
}
