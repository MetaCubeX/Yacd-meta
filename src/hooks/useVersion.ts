import { queryOptions, useQuery, useSuspenseQuery } from '@tanstack/react-query';

import { fetchVersion } from '~/api/version';
import { ClashAPIConfig } from '~/types';

export const versionQueryKey = (apiConfig: ClashAPIConfig) => ['/version', apiConfig] as const;

/**
 * versionQueryOptions 是 /version 查询的共用配置，所有读版本号的地方都该用它。
 *
 * 版本号只在内核升级时变化，而升级流程（modules/config/hooks.ts）会把新版本号
 * setQueryData 进缓存，所以永不过期。否则每个代理组挂载都会触发一次后台重取，
 * 切一次标签页就是一次多余的 /version 请求。
 */
export const versionQueryOptions = (apiConfig: ClashAPIConfig) =>
  queryOptions({
    queryKey: versionQueryKey(apiConfig),
    queryFn: () => fetchVersion('/version', apiConfig),
    staleTime: Infinity,
  });

/** 内核版本信息。侧边栏和代理组都要用它区分 mihomo / sing-box，共用同一份缓存 */
export function useVersion(apiConfig: ClashAPIConfig) {
  const { data } = useSuspenseQuery(versionQueryOptions(apiConfig));
  return data;
}

/**
 * useVersionNoSuspense reads the same cache as useVersion but never suspends: data is
 * undefined until the first request settles. For UI that must stay usable while the backend
 * is unreachable, such as the sidebar's backend switcher.
 */
export function useVersionNoSuspense(apiConfig: ClashAPIConfig) {
  const { data } = useQuery(versionQueryOptions(apiConfig));
  return data;
}
