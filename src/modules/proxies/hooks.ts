import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import * as React from 'react';

import * as connAPI from '~/api/connections';
import * as proxiesAPI from '~/api/proxies';
import i18n from '~/misc/i18n';
import { readErrorMessage } from '~/misc/request-helper';
import { delayPatchesAtom, proxyFilterText, setDelayPatch } from '~/store/proxies';
import { useStoreActions } from '~/store/StateProvider';
import { toast } from '~/store/toast';
import { DelayMapping, FormattedProxyProvider, ProxiesMapping, ProxyItem } from '~/store/types';
import { ClashAPIConfig } from '~/types';

import {
  formatProxyProviders,
  matchesFilter,
  mergeDelayMapping,
  NonProxyTypes,
  parseFilterSegments,
  ProxiesAppConfig,
  resolveChain,
  resolveGroupTestUrl,
  retrieveGroupNamesFrom,
  splitItemsByLayout,
  withTimeout,
} from './utils';

const { useCallback, useEffect, useMemo, useRef, useState } = React;

const PROXIES_QUERY_KEY = '/proxies';

type SwitchTo = { groupName: string; itemName: string };

export type ProxiesData = {
  proxies: ProxiesMapping;
  groupNames: string[];
  proxyProviders: FormattedProxyProvider[];
  /** 不属于任何提供商的节点，只有这批能单独调 /proxies/{name}/delay */
  dangleProxyNames: string[];
};

async function fetchProxiesData(apiConfig: ClashAPIConfig): Promise<ProxiesData> {
  const [proxiesData, providersData] = await Promise.all([
    proxiesAPI.fetchProxies(apiConfig),
    proxiesAPI.fetchProviderProxies(apiConfig),
  ]);

  const { providers: proxyProviders, proxies: providerProxies } = formatProxyProviders(
    providersData.providers,
  );
  const proxies = { ...providerProxies, ...proxiesData.proxies };
  // /proxies 的同名条目会盖掉 provider 那份，把 providerName 补回去
  for (const name of Object.keys(providerProxies)) {
    if (proxies[name]) {
      proxies[name] = { ...proxies[name], providerName: providerProxies[name].providerName };
    }
  }

  const [groupNames, proxyNames] = retrieveGroupNamesFrom(proxies);
  const dangleProxyNames = proxyNames.filter((name) => !providerProxies[name]);

  return { proxies, groupNames, proxyProviders, dangleProxyNames };
}

export function useProxiesQuery(apiConfig: ClashAPIConfig) {
  return useSuspenseQuery({
    queryKey: [PROXIES_QUERY_KEY, apiConfig],
    queryFn: () => fetchProxiesData(apiConfig),
    // 窗口重新聚焦时是否重拉由 staleTime 决定，30s 是旧实现手写的那个窗口
    staleTime: 30_000,
  });
}

/**
 * 缓存的读写入口。这里刻意不订阅查询——ProxyGroup / ProxyProvider 只在触发动作时
 * 需要读数据，订阅了会让它们跟着每次刷新重渲染，memo 就白做了。
 */
function useProxiesCache(apiConfig: ClashAPIConfig) {
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => [PROXIES_QUERY_KEY, apiConfig], [apiConfig]);

  const getData = useCallback(
    () => queryClient.getQueryData<ProxiesData>(queryKey),
    [queryClient, queryKey],
  );
  const invalidate = useCallback(
    () => queryClient.invalidateQueries({ queryKey }),
    [queryClient, queryKey],
  );

  return { queryClient, queryKey, getData, invalidate };
}

/**
 * 展示用的延迟表。合并规则见 utils 的 mergeDelayMapping；这里把上一轮结果留在 ref 里，
 * 逐项复用引用，否则批量测速时每次刷新都会让所有 Proxy 的 memo 失效。
 */
export function useDelayMapping(proxies: ProxiesMapping, dataUpdatedAt: number): DelayMapping {
  const patches = useAtomValue(delayPatchesAtom);
  const cache = useRef<{
    proxies: ProxiesMapping;
    patches: DelayMapping;
    dataUpdatedAt: number;
    result: DelayMapping;
  } | null>(null);

  const prev = cache.current;
  if (
    !prev ||
    prev.proxies !== proxies ||
    prev.patches !== patches ||
    prev.dataUpdatedAt !== dataUpdatedAt
  ) {
    const result = mergeDelayMapping(prev ? prev.result : {}, proxies, patches, dataUpdatedAt);
    const next = { proxies, patches, dataUpdatedAt, result };
    cache.current = next;
    return next.result;
  }
  return prev.result;
}

const noop = (): null => null;

/** 关掉走 groupName、但没走 exceptionItemName 的那些连接 */
async function closeGroupConns(
  apiConfig: ClashAPIConfig,
  groupName: string,
  exceptionItemName: string,
) {
  const res = await connAPI.fetchConns(apiConfig);
  if (!res.ok) {
    console.log('unable to fetch all connections', res.statusText);
  }
  const json = await res.json();
  const idsToClose = [];
  for (const conn of json.connections) {
    if (conn.chains.indexOf(groupName) > -1 && conn.chains.indexOf(exceptionItemName) < 0) {
      idsToClose.push(conn.id);
    }
  }
  await Promise.all(idsToClose.map((id) => connAPI.closeConnById(apiConfig, id).catch(noop)));
}

function closePrevConns(apiConfig: ClashAPIConfig, proxies: ProxiesMapping, switchTo: SwitchTo) {
  const chain = resolveChain(proxies, switchTo.groupName, switchTo.itemName);
  closeGroupConns(apiConfig, switchTo.groupName, chain[0]);
}

/** 切换节点：先乐观改缓存，失败回滚并弹出后端给的原因 */
export function useSwitchProxy(apiConfig: ClashAPIConfig, autoCloseOldConns: boolean) {
  const { queryClient, queryKey, getData, invalidate } = useProxiesCache(apiConfig);

  const { mutate } = useMutation({
    mutationFn: async ({ groupName, itemName }: SwitchTo) => {
      const res = await proxiesAPI.requestToSwitchProxy(apiConfig, groupName, itemName);
      if (!res.ok) throw new Error(await readErrorMessage(res));
    },
    onMutate: async ({ groupName, itemName }: SwitchTo) => {
      await queryClient.cancelQueries({ queryKey });
      const snapshot = getData();
      queryClient.setQueryData<ProxiesData>(queryKey, (old) => {
        const group = old?.proxies[groupName];
        if (!old || !group?.now) return old;
        return {
          ...old,
          proxies: { ...old.proxies, [groupName]: { ...group, now: itemName } },
        };
      });
      return { snapshot };
    },
    onError: (err, { groupName }, ctx) => {
      if (ctx?.snapshot) queryClient.setQueryData(queryKey, ctx.snapshot);
      toast('error', i18n.t('switch_proxy_failed', { group: groupName, message: err.message }));
    },
    onSuccess: (_data, switchTo) => {
      if (!autoCloseOldConns) return;
      const data = getData();
      if (data) closePrevConns(apiConfig, data.proxies, switchTo);
    },
    onSettled: () => invalidate(),
  });

  return useCallback(
    (groupName: string, itemName: string) => mutate({ groupName, itemName }),
    [mutate],
  );
}

/**
 * 单个节点测速。结果只落在 delay patch 里，不动查询缓存——后端的 history 会在
 * 下一次刷新时带上同样的数字。
 */
export function useTestProxyLatency(apiConfig: ClashAPIConfig, appConfig: ProxiesAppConfig) {
  const { latencyTestUrl, latencyTestTimeout, latencyTestExpectedStatus } = appConfig;

  return useCallback(
    async (name: string, providerName?: string) => {
      setDelayPatch(name, { testing: true, error: '' });

      let delayNumber: number | undefined;
      let error = '';
      try {
        const res = providerName
          ? await proxiesAPI.healthcheckProviderProxy(
              apiConfig,
              providerName,
              name,
              latencyTestUrl,
              latencyTestTimeout,
              latencyTestExpectedStatus,
            )
          : await proxiesAPI.requestDelayForProxy(
              apiConfig,
              name,
              latencyTestUrl,
              latencyTestTimeout,
              latencyTestExpectedStatus,
            );
        if (!res.ok) error = res.statusText;
        const body = await res.json().catch((): undefined => undefined);
        delayNumber = body?.delay;
      } catch (err) {
        error = (err as Error).message || 'Request failed';
      }

      const number = typeof delayNumber === 'number' && delayNumber > 0 ? delayNumber : undefined;
      setDelayPatch(name, {
        number,
        error: error || (number === undefined ? 'Timeout' : ''),
        testing: false,
      });
    },
    [apiConfig, latencyTestUrl, latencyTestTimeout, latencyTestExpectedStatus],
  );
}

async function healthcheckProvider(apiConfig: ClashAPIConfig, name: string, timeout: number) {
  await withTimeout(timeout, async (signal) => {
    try {
      await proxiesAPI.healthcheckProviderByName(apiConfig, name, signal);
    } catch (err) {
      // 客户端超时触发的 AbortError 也走这里，忽略即可
    }
  });
}

/**
 * 整组测速。Meta 后端有 /group/{name}/delay，一次请求测完整组；老后端只能逐个节点测。
 */
export function useTestGroupLatency(
  apiConfig: ClashAPIConfig,
  appConfig: ProxiesAppConfig,
): [(opts: { groupName: string; isMeta: boolean; memberNames: string[] }) => void, boolean] {
  const { getData, invalidate } = useProxiesCache(apiConfig);
  const testProxy = useTestProxyLatency(apiConfig, appConfig);
  const { latencyTestTimeout, latencyTestExpectedStatus } = appConfig;

  const { mutate, isPending } = useMutation({
    mutationFn: async ({
      groupName,
      isMeta,
      memberNames,
    }: {
      groupName: string;
      isMeta: boolean;
      memberNames: string[];
    }) => {
      if (isMeta) {
        const group = getData()?.proxies[groupName];
        await proxiesAPI.requestDelayForProxyGroup(
          apiConfig,
          groupName,
          resolveGroupTestUrl(group, appConfig),
          latencyTestTimeout,
          latencyTestExpectedStatus,
        );
        return;
      }
      const dangle = getData()?.dangleProxyNames ?? [];
      await Promise.all(
        memberNames.filter((name) => dangle.indexOf(name) > -1).map((name) => testProxy(name)),
      );
    },
    onSettled: () => invalidate(),
  });

  return [mutate, isPending];
}

/** 「全部测速」：先并发测所有独立节点，再逐个跑提供商的健康检查 */
export function useTestAllLatency(
  apiConfig: ClashAPIConfig,
  appConfig: ProxiesAppConfig,
): [() => void, boolean] {
  const { getData, invalidate } = useProxiesCache(apiConfig);
  const testProxy = useTestProxyLatency(apiConfig, appConfig);
  const { providerHealthcheckTimeout } = appConfig;

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const data = getData();
      if (!data) return;
      await Promise.all(data.dangleProxyNames.map((name) => testProxy(name)));
      // 一个一个来，每个都设上限，免得某个慢提供商拖住整轮
      for (const provider of data.proxyProviders) {
        await healthcheckProvider(apiConfig, provider.name, providerHealthcheckTimeout);
      }
    },
    onSettled: () => invalidate(),
  });

  return [mutate, isPending];
}

export function useHealthcheckProvider(
  apiConfig: ClashAPIConfig,
  timeout: number,
): [(name: string) => void, boolean] {
  const { invalidate } = useProxiesCache(apiConfig);
  const { mutate, isPending } = useMutation({
    mutationFn: (name: string) => healthcheckProvider(apiConfig, name, timeout),
    onSettled: () => invalidate(),
  });
  return [mutate, isPending];
}

export function useUpdateProviderItem(
  apiConfig: ClashAPIConfig,
): [(name: string) => void, boolean] {
  const { invalidate } = useProxiesCache(apiConfig);
  const { mutate, isPending } = useMutation({
    mutationFn: (name: string) => proxiesAPI.updateProviderByName(apiConfig, name),
    onSettled: () => invalidate(),
  });
  return [mutate, isPending];
}

export function useUpdateProviderItems(
  apiConfig: ClashAPIConfig,
  names: string[],
): [() => void, boolean] {
  const { invalidate } = useProxiesCache(apiConfig);
  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      for (const name of names) {
        await proxiesAPI.updateProviderByName(apiConfig, name).catch(noop);
      }
    },
    onSettled: () => invalidate(),
  });
  return [mutate, isPending];
}

function filterAvailableProxies(list: string[], delay: DelayMapping) {
  return list.filter((name) => {
    const d = delay[name];
    if (d === undefined) {
      return true;
    }
    if (d.number === 0) {
      return false;
    }
    return true;
  });
}

const getSortDelay = (
  d:
    | undefined
    | {
        number?: number;
      },
  proxyInfo?: ProxyItem,
) => {
  if (d && typeof d.number === 'number' && d.number > 0) {
    return d.number;
  }

  const type = proxyInfo && proxyInfo.type;
  if (type && NonProxyTypes.indexOf(type) > -1) return -1;

  return 999999;
};

const ProxySortingFns = {
  Natural: (proxies: string[]) => proxies,
  LatencyAsc: (proxies: string[], delay: DelayMapping, proxyMapping?: ProxiesMapping) => {
    return proxies.sort((a, b) => {
      const d1 = getSortDelay(delay[a], proxyMapping && proxyMapping[a]);
      const d2 = getSortDelay(delay[b], proxyMapping && proxyMapping[b]);
      return d1 - d2;
    });
  },
  LatencyDesc: (proxies: string[], delay: DelayMapping, proxyMapping?: ProxiesMapping) => {
    return proxies.sort((a, b) => {
      const d1 = getSortDelay(delay[a], proxyMapping && proxyMapping[a]);
      const d2 = getSortDelay(delay[b], proxyMapping && proxyMapping[b]);
      return d2 - d1;
    });
  },
  NameAsc: (proxies: string[]) => {
    return proxies.sort();
  },
  NameDesc: (proxies: string[]) => {
    return proxies.sort((a, b) => {
      if (a > b) return -1;
      if (a < b) return 1;
      return 0;
    });
  },
};

type ProxySortBy = keyof typeof ProxySortingFns;

function filterAvailableProxiesAndSort(
  all: string[],
  delay: DelayMapping,
  hideUnavailableProxies: boolean,
  segments: string[],
  proxySortBy: string,
  proxies?: ProxiesMapping,
) {
  let filtered = [...all];
  if (hideUnavailableProxies) {
    filtered = filterAvailableProxies(all, delay);
  }

  if (segments.length > 0) {
    filtered = filtered.filter((name) => matchesFilter(name, segments));
  }
  // proxySortBy 来自 localStorage，可能是旧版本留下的、已经不存在的排序名
  const sortFn = ProxySortingFns[proxySortBy as ProxySortBy] ?? ProxySortingFns.Natural;
  return sortFn(filtered, delay, proxies);
}

const EMPTY_SEGMENTS: string[] = [];

/** 搜索框当前的分词，空数组表示没有搜索 */
export function useFilterSegments(): string[] {
  const filterText = useAtomValue(proxyFilterText);
  return useMemo(() => parseFilterSegments(filterText), [filterText]);
}

export function useFilteredAndSorted(
  all: string[],
  delay: DelayMapping,
  hideUnavailableProxies: boolean,
  proxySortBy: string,
  proxies?: ProxiesMapping,
  /** 组名本身命中搜索时，组内节点就不再过滤，整组原样展示 */
  skipTextFilter = false,
) {
  const segments = useFilterSegments();
  const effectiveSegments = skipTextFilter ? EMPTY_SEGMENTS : segments;
  return useMemo(
    () =>
      filterAvailableProxiesAndSort(
        all,
        delay,
        hideUnavailableProxies,
        effectiveSegments,
        proxySortBy,
        proxies,
      ),
    [all, delay, hideUnavailableProxies, effectiveSegments, proxySortBy, proxies],
  );
}

/** 代理组：组名命中，或组内有节点命中，才留在列表里 */
export function useVisibleGroupNames(groupNames: string[], proxies: ProxiesMapping): string[] {
  const segments = useFilterSegments();
  return useMemo(() => {
    if (segments.length === 0) return groupNames;
    return groupNames.filter((name) => {
      if (matchesFilter(name, segments)) return true;
      const group = proxies[name] as (ProxyItem & { all?: string[] }) | undefined;
      return (group?.all ?? []).some((n) => matchesFilter(n, segments));
    });
  }, [groupNames, proxies, segments]);
}

/** 提供商：同上，名称命中或旗下有节点命中 */
export function useVisibleProviders(providers: FormattedProxyProvider[]): FormattedProxyProvider[] {
  const segments = useFilterSegments();
  return useMemo(() => {
    if (segments.length === 0) return providers;
    return providers.filter(
      (p) => matchesFilter(p.name, segments) || p.proxies.some((n) => matchesFilter(n, segments)),
    );
  }, [providers, segments]);
}

/**
 * 搜索时，仅因为「组内节点命中」才留下来的卡片会自动展开——否则只能看到一排
 * 圆点，还得手动点开才能看见搜到的节点。用户手动收起时用本地 override 记下来，
 * 不写进持久化的折叠状态；搜索词一变就重置。
 */
export function useFilterAwareCollapse({
  isOpen,
  nameMatched,
  onToggle,
}: {
  isOpen: boolean;
  nameMatched: boolean;
  onToggle: (next: boolean) => void;
}): [boolean, () => void] {
  const segments = useFilterSegments();
  const [collapseOverride, setCollapseOverride] = useState(false);

  useEffect(() => {
    setCollapseOverride(false);
  }, [segments]);

  const forceOpen = segments.length > 0 && !nameMatched && !collapseOverride;
  const effectiveIsOpen = isOpen || forceOpen;

  const toggle = useCallback(() => {
    if (forceOpen) {
      setCollapseOverride(true);
      return;
    }
    onToggle(!effectiveIsOpen);
  }, [forceOpen, effectiveIsOpen, onToggle]);

  return [effectiveIsOpen, toggle];
}

export function useProxiesPage({
  groupNames,
  proxyProviders,
  proxiesLayout,
}: {
  groupNames: string[];
  proxyProviders: FormattedProxyProvider[];
  proxiesLayout: string;
}) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const closeSettings = useCallback(() => {
    setIsSettingsOpen(false);
  }, []);
  const toggleSettings = useCallback(() => {
    setIsSettingsOpen((v) => !v);
  }, []);

  const [activeTab, setActiveTab] = useState<'proxies' | 'providers'>('proxies');

  const proxyGroups = useMemo(() => {
    const formatted = groupNames.map((name, i) => ({ name, i }));
    return splitItemsByLayout(formatted, proxiesLayout);
  }, [groupNames, proxiesLayout]);

  const providers = useMemo(() => {
    const formatted = proxyProviders.map((item, i) => ({ item, i }));
    return splitItemsByLayout(formatted, proxiesLayout);
  }, [proxyProviders, proxiesLayout]);

  return {
    isSettingsOpen,
    toggleSettings,
    closeSettings,
    activeTab,
    setActiveTab,
    proxyGroups,
    providers,
  };
}

/**
 * 「全部收起 / 全部展开」：只要当前标签页下还有展开的分组就收起全部，
 * 全部已收起时再点则展开全部。
 */
export function useCollapseAll({
  prefix,
  names,
  collapsibleIsOpen,
}: {
  prefix: string;
  names: string[];
  collapsibleIsOpen: Record<string, boolean>;
}): [() => void, boolean] {
  const {
    app: { updateCollapsibleIsOpenBulk },
  } = useStoreActions();

  const allCollapsed = useMemo(
    () => !names.some((name) => collapsibleIsOpen[`${prefix}:${name}`]),
    [names, collapsibleIsOpen, prefix],
  );

  const toggleAll = useCallback(() => {
    updateCollapsibleIsOpenBulk(prefix, names, allCollapsed);
  }, [updateCollapsibleIsOpenBulk, prefix, names, allCollapsed]);

  return [toggleAll, allCollapsed];
}
