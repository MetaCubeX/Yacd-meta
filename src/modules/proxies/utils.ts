import {
  DelayMapping,
  FormattedProxyProvider,
  ProxiesMapping,
  ProxyItem,
  ProxyProvider,
} from '~/store/types';

export const PROXY_SORT_OPTIONS = [
  ['Natural', 'order_natural'],
  ['LatencyAsc', 'order_latency_asc'],
  ['LatencyDesc', 'order_latency_desc'],
  ['NameAsc', 'order_name_asc'],
  ['NameDesc', 'order_name_desc'],
] as const;

/** 搜索框分词：空格分隔，任一词命中即算命中 */
export function parseFilterSegments(filterText: string): string[] {
  if (typeof filterText !== 'string') return [];
  return filterText
    .toLowerCase()
    .split(' ')
    .map((x) => x.trim())
    .filter((x) => !!x);
}

/** 无搜索词时一律视为命中 */
export function matchesFilter(name: string, segments: string[]): boolean {
  if (segments.length === 0) return true;
  const lower = name.toLowerCase();
  return segments.some((seg) => lower.indexOf(seg) > -1);
}

/**
 * 排序设置在 UI 上拆成「维度 + 方向」两层：分段控件选维度，
 * 再次点击同一维度切换升/降序。store 里仍然只存原来那 5 个值。
 */
export type ProxySortKey = 'Natural' | 'Latency' | 'Name';

export function getProxySortKey(proxySortBy: string): ProxySortKey {
  if (proxySortBy.startsWith('Latency')) return 'Latency';
  if (proxySortBy.startsWith('Name')) return 'Name';
  return 'Natural';
}

/** 「原始顺序」没有方向，返回 null */
export function getProxySortDirection(proxySortBy: string): 'Asc' | 'Desc' | null {
  if (proxySortBy.endsWith('Desc')) return 'Desc';
  if (proxySortBy.endsWith('Asc')) return 'Asc';
  return null;
}

/** 点击某个维度后的下一个 proxySortBy：切维度时用升序，点当前维度则反向 */
export function nextProxySortBy(proxySortBy: string, key: ProxySortKey): string {
  if (key === 'Natural') return 'Natural';
  if (getProxySortKey(proxySortBy) !== key) return `${key}Asc`;
  return getProxySortDirection(proxySortBy) === 'Asc' ? `${key}Desc` : `${key}Asc`;
}

/** 测速超时的常用档位（毫秒） */
export const LATENCY_TIMEOUT_PRESETS = [2000, 5000, 10000];

/** 订阅健康检查超时的常用档位（毫秒） */
export const HEALTHCHECK_TIMEOUT_PRESETS = [5000, 10000, 20000];

/** 把当前值并进档位里，避免旧配置里的自定义值在分段控件上「没有选中项」 */
export function withCurrentTimeout(presets: number[], current: number): number[] {
  if (!current || presets.includes(current)) return presets;
  return [...presets, current].sort((a, b) => a - b);
}

export function splitItemsByLayout<T>(items: T[], layout: string) {
  if (layout !== 'double') {
    return [items];
  }

  const left: T[] = [];
  const right: T[] = [];
  items.forEach((item, index) => {
    if (index % 2 === 0) {
      left.push(item);
    } else {
      right.push(item);
    }
  });

  return [left, right];
}

export function getProxyLatency(
  proxies: ProxiesMapping,
  delay: DelayMapping,
  name: string,
  visited = new Set<string>(),
) {
  if (visited.has(name)) return undefined;
  visited.add(name);

  const latency = delay[name];
  if (latency && (latency.testing || typeof latency.number === 'number' || latency.error)) {
    return latency;
  }

  const proxy = proxies[name];
  if (proxy && proxy.now && proxies[proxy.now]) {
    return getProxyLatency(proxies, delay, proxy.now, visited);
  }

  const delayFromHistory = proxy?.history?.[proxy.history.length - 1]?.delay;
  if (typeof delayFromHistory === 'number' && delayFromHistory > 0) {
    return { number: delayFromHistory };
  }

  return latency;
}

// see all types:
// https://github.com/Dreamacro/clash/blob/master/constant/adapters.go
export const NonProxyTypes = [
  'Direct',
  'Fallback',
  'Reject',
  'Pass',
  'Selector',
  'URLTest',
  'LoadBalance',
  'Unknown',
];

/**
 * 组名按它们在 GLOBAL 组里的顺序排；同时挑出「真正的节点」（非组、非内置类型），
 * 后者是可以单独测速的那批。
 */
export function retrieveGroupNamesFrom(proxies: ProxiesMapping): [string[], string[]] {
  let groupNames: string[] = [];
  let globalAll: string[] | undefined;
  const proxyNames: string[] = [];
  for (const prop in proxies) {
    const p = proxies[prop];
    if (p.all && Array.isArray(p.all)) {
      if (!p.hidden) {
        groupNames.push(prop);
      }
      if (prop === 'GLOBAL') {
        globalAll = Array.from(p.all);
      }
    } else if (NonProxyTypes.indexOf(p.type) < 0) {
      proxyNames.push(prop);
    }
  }
  if (globalAll) {
    globalAll.push('GLOBAL');
    groupNames = groupNames
      .map((name): [number, string] => [globalAll.indexOf(name), name])
      .sort((a, b) => a[0] - b[0])
      .map(([, name]) => name);
  }
  return [groupNames, proxyNames];
}

/** provider 的 proxies 从对象数组摊成名字数组，节点本身并进全局 mapping 并记下出处 */
export function formatProxyProviders(providersInput: Record<string, ProxyProvider>): {
  providers: FormattedProxyProvider[];
  proxies: ProxiesMapping;
} {
  const providers: FormattedProxyProvider[] = [];
  const proxies: ProxiesMapping = {};
  for (const key of Object.keys(providersInput)) {
    const provider = providersInput[key];
    if (provider.name === 'default' || provider.vehicleType === 'Compatible') {
      continue;
    }
    const names: string[] = [];
    for (const proxy of provider.proxies) {
      proxies[proxy.name] = { ...proxy, providerName: provider.name };
      names.push(proxy.name);
    }
    providers.push({ ...provider, proxies: names });
  }
  return { providers, proxies };
}

type DelayEntry = DelayMapping[string];

function sameDelayEntry(a: DelayEntry, b: DelayEntry) {
  return (
    a.number === b.number &&
    a.error === b.error &&
    a.testing === b.testing &&
    a.updatedAt === b.updatedAt
  );
}

/**
 * 组和内置节点（DIRECT/REJECT…）不进延迟表：延迟排序按类型把它们排在最前，
 * 「隐藏不可用节点」也不该因为一个组自己测出 0 就把整组藏掉。判据同
 * retrieveGroupNamesFrom 挑 proxyNames 的那条。
 */
function historyDelayOf(proxy: ProxyItem | undefined): number | undefined {
  if (!proxy || proxy.all || NonProxyTypes.indexOf(proxy.type) > -1) return undefined;
  const history = proxy.history;
  return history?.[history.length - 1]?.delay;
}

/**
 * 展示用的延迟表 = 查询数据里 history 的末条，叠上比这批数据更新的测速结果。
 * 「后端数据一到就盖掉本地测速结果」是旧实现每次 fetch 都做的事，这里用时间戳表达。
 * 逐项复用上一轮的对象，否则批量测速每 100ms 换一次表，几百个 Proxy 的 memo 全部失效。
 */
export function mergeDelayMapping(
  prev: DelayMapping,
  proxies: ProxiesMapping,
  patches: DelayMapping,
  dataUpdatedAt: number,
): DelayMapping {
  const next: DelayMapping = {};
  const names = new Set([...Object.keys(proxies), ...Object.keys(patches)]);
  for (const name of names) {
    const patch = patches[name];
    let entry: DelayEntry | undefined;
    if (patch && (patch.updatedAt ?? 0) > dataUpdatedAt) {
      entry = patch;
    } else {
      const delay = historyDelayOf(proxies[name]);
      entry = typeof delay === 'number' ? { number: delay } : patch;
    }
    if (!entry) continue;
    const prevEntry = prev[name];
    next[name] = prevEntry && sameDelayEntry(prevEntry, entry) ? prevEntry : entry;
  }
  return next;
}

/** 代理页用到的那部分 app 偏好，来自 pages/ProxiesPage 的 createSelector */
export type ProxiesAppConfig = {
  proxySortBy: string;
  hideUnavailableProxies: boolean;
  autoCloseOldConns: boolean;
  proxiesLayout: string;
  proxyGroupByProvider: boolean;
  latencyTestUrl: string;
  latencyTestTimeout: number;
  latencyTestExpectedStatus: string;
  preferBackendLatencyTestUrl: boolean;
  providerHealthcheckTimeout: number;
};

/** 带超时跑一段异步逻辑，signal 交给调用方传给 fetch */
export async function withTimeout(ms: number, fn: (signal: AbortSignal) => Promise<void>) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    await fn(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 后端给这个组配的测速地址：优先 testUrl，退回 extra 的第一个键（extra 按测速地址分组）。
 * 面板设置里勾了「优先用后端的测速地址」才走这条，否则用面板自己的地址。
 */
export function resolveGroupTestUrl(
  group: ProxyItem | undefined,
  appConfig: Pick<ProxiesAppConfig, 'latencyTestUrl' | 'preferBackendLatencyTestUrl'>,
): string {
  if (appConfig.preferBackendLatencyTestUrl && group) {
    if (group.testUrl) return group.testUrl;
    const keys = group.extra ? Object.keys(group.extra) : [];
    if (keys.length > 0) return keys[0];
  }
  return appConfig.latencyTestUrl;
}

/** 从 groupName 选中的节点一路往下走，得到完整的代理链 */
export function resolveChain(proxies: ProxiesMapping, groupName: string, itemName: string) {
  const chain = [itemName, groupName];
  let child: ProxyItem;
  let childKey = itemName;
  while ((child = proxies[childKey]) && child.now) {
    chain.unshift(child.now);
    childKey = child.now;
  }
  return chain;
}
