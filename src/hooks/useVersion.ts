import { useQuery, useSuspenseQuery } from '@tanstack/react-query';

import { fetchVersion } from '~/api/version';
import { ClashAPIConfig } from '~/types';

export const versionQueryKey = (apiConfig: ClashAPIConfig) => ['/version', apiConfig] as const;

/** 内核版本信息。侧边栏和代理组都要用它区分 mihomo / sing-box，共用同一份缓存 */
export function useVersion(apiConfig: ClashAPIConfig) {
  const { data } = useSuspenseQuery({
    queryKey: versionQueryKey(apiConfig),
    queryFn: () => fetchVersion('/version', apiConfig),
  });
  return data;
}

/**
 * useVersionNoSuspense reads the same cache as useVersion but never suspends: data is
 * undefined until the first request settles. For UI that must stay usable while the backend
 * is unreachable, such as the sidebar's backend switcher.
 */
export function useVersionNoSuspense(apiConfig: ClashAPIConfig) {
  const { data } = useQuery({
    queryKey: versionQueryKey(apiConfig),
    queryFn: () => fetchVersion('/version', apiConfig),
  });
  return data;
}
