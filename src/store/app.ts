import {
  DispatchFn,
  GetStateFn,
  State,
  StateApp,
  TabTitleConfig,
  TITLE_SEGMENT_KINDS,
} from '~/store/types';
import type { ClashAPIConfig } from '~/types';

import { DEFAULT_LATENCY_TEST_URL, PROVIDER_HEALTHCHECK_TIMEOUT } from '../misc/constants';
import { loadState, saveState } from '../misc/storage';
import { debounce, trimTrailingSlash } from '../misc/utils';

export const getClashAPIConfig = (s: State) => {
  const idx = s.app.selectedClashAPIConfigIndex;
  return s.app.clashAPIConfigs[idx];
};
export const getSelectedClashAPIConfigIndex = (s: State) => s.app.selectedClashAPIConfigIndex;
export const getClashAPIConfigs = (s: State) => s.app.clashAPIConfigs;
export const getTheme = (s: State) => s.app.theme;
export const getSelectedChartStyleIndex = (s: State) => s.app.selectedChartStyleIndex;
export const getLatencyTestUrl = (s: State) => s.app.latencyTestUrl;
export const getLatencyTestTimeout = (s: State) => s.app.latencyTestTimeout;
export const getLatencyTestExpectedStatus = (s: State) => s.app.latencyTestExpectedStatus;
export const getPreferBackendLatencyTestUrl = (s: State) => s.app.preferBackendLatencyTestUrl;
export const getProviderHealthcheckTimeout = (s: State) => s.app.providerHealthcheckTimeout;
export const getCollapsibleIsOpen = (s: State) => s.app.collapsibleIsOpen;
export const getProxySortBy = (s: State) => s.app.proxySortBy;
export const getHideUnavailableProxies = (s: State) => s.app.hideUnavailableProxies;
export const getAutoCloseOldConns = (s: State) => s.app.autoCloseOldConns;
export const getLogStreamingPaused = (s: State) => s.app.logStreamingPaused;
export const getProxiesLayout = (s: State) => s.app.proxiesLayout;
export const getProxyGroupByProvider = (s: State) => s.app.proxyGroupByProvider;
export const getTabTitle = (s: State) => s.app.tabTitle;

const saveStateDebounced = debounce(saveState, 600);

function findClashAPIConfigIndex(getState: GetStateFn, { baseURL, secret }: ClashAPIConfig) {
  const arr = getClashAPIConfigs(getState());
  for (let i = 0; i < arr.length; i++) {
    const x = arr[i];
    if (x.baseURL === baseURL && x.secret === secret) return i;
  }
}

export function addClashAPIConfig({ baseURL, secret }: ClashAPIConfig) {
  return async (dispatch: DispatchFn, getState: GetStateFn) => {
    const idx = findClashAPIConfigIndex(getState, { baseURL, secret });
    // already exists
    if (idx !== undefined) return;

    const clashAPIConfig = { baseURL, secret, addedAt: Date.now() };
    dispatch('addClashAPIConfig', (s) => {
      s.app.clashAPIConfigs.push(clashAPIConfig);
    });
    // side effect
    saveState(getState().app);
  };
}

export function removeClashAPIConfig({ baseURL, secret }: ClashAPIConfig) {
  return async (dispatch: DispatchFn, getState: GetStateFn) => {
    const idx = findClashAPIConfigIndex(getState, { baseURL, secret });
    if (idx === undefined) return;
    dispatch('removeClashAPIConfig', (s) => {
      s.app.clashAPIConfigs.splice(idx, 1);
      // 删掉的是选中项前面的条目时，选中项会左移一位，索引得跟着挪
      if (s.app.selectedClashAPIConfigIndex > idx) {
        s.app.selectedClashAPIConfigIndex -= 1;
      }
    });
    // side effect
    saveState(getState().app);
  };
}

/**
 * 选中一条后端并整页 reload。nextHash 给出时 reload 落到这个路由，不给就留在当前路由。
 */
export function selectClashAPIConfig({ baseURL, secret }: ClashAPIConfig, nextHash?: string) {
  return async (dispatch: DispatchFn, getState: GetStateFn) => {
    const idx = findClashAPIConfigIndex(getState, { baseURL, secret });
    if (idx === undefined) return;
    const curr = getSelectedClashAPIConfigIndex(getState());
    if (curr !== idx) {
      dispatch('selectClashAPIConfig', (s) => {
        s.app.selectedClashAPIConfigIndex = idx;
      });
    }
    // side effect
    saveState(getState().app);

    // manual clean up is too complex
    // we just reload the app
    try {
      // replaceState 不触发 popstate，路由不会在 reload 前先渲染一次目标页
      if (nextHash) window.history.replaceState(null, '', nextHash);
      window.location.reload();
    } catch (err) {
      // ignore
    }
  };
}

/**
 * 就地修改一条已保存的后端。改的是当前选中的那条时整页 reload —— 和
 * selectClashAPIConfig 同理由：地址或密钥变了，在途的请求和 WebSocket
 * 还连着旧后端，手动清理这些状态太复杂。
 */
export function updateClashAPIConfig(prev: ClashAPIConfig, next: ClashAPIConfig) {
  return async (dispatch: DispatchFn, getState: GetStateFn) => {
    const idx = findClashAPIConfigIndex(getState, prev);
    if (idx === undefined) return;

    const wasSelected = getSelectedClashAPIConfigIndex(getState()) === idx;
    const duplicateIdx = findClashAPIConfigIndex(getState, next);

    if (duplicateIdx !== undefined) {
      // 改回了原样，什么都不用做
      if (duplicateIdx === idx) return;
      // 改成了另一条已存在的配置，去重：删掉正在编辑的这条，选中留下的那条
      dispatch('mergeClashAPIConfig', (s) => {
        s.app.clashAPIConfigs.splice(idx, 1);
        const survivor = duplicateIdx > idx ? duplicateIdx - 1 : duplicateIdx;
        if (wasSelected) {
          s.app.selectedClashAPIConfigIndex = survivor;
        } else if (s.app.selectedClashAPIConfigIndex > idx) {
          s.app.selectedClashAPIConfigIndex -= 1;
        }
      });
    } else {
      dispatch('appUpdateClashAPIConfig', (s) => {
        s.app.clashAPIConfigs[idx] = {
          baseURL: next.baseURL,
          secret: next.secret,
          addedAt: s.app.clashAPIConfigs[idx].addedAt,
        };
      });
    }

    // side effect
    saveState(getState().app);

    if (!wasSelected) return;
    try {
      window.location.reload();
    } catch (err) {
      // ignore
    }
  };
}

const rootEl = document.documentElement;
type ThemeType = 'dark' | 'light' | 'auto';

function setTheme(theme: ThemeType = 'light') {
  if (theme === 'auto') {
    rootEl.setAttribute('data-theme', 'auto');
  } else if (theme === 'dark') {
    rootEl.setAttribute('data-theme', 'dark');
  } else {
    rootEl.setAttribute('data-theme', 'light');
  }
}

export function switchTheme(nextTheme = 'auto') {
  return (dispatch: DispatchFn, getState: GetStateFn) => {
    const currentTheme = getTheme(getState());
    if (currentTheme === nextTheme) return;
    // side effect
    setTheme(nextTheme as ThemeType);
    dispatch('storeSwitchTheme', (s) => {
      s.app.theme = nextTheme;
    });
    // side effect
    saveState(getState().app);
  };
}

export function selectChartStyleIndex(selectedChartStyleIndex: number | string) {
  return (dispatch: DispatchFn, getState: GetStateFn) => {
    dispatch('appSelectChartStyleIndex', (s) => {
      s.app.selectedChartStyleIndex = Number(selectedChartStyleIndex);
    });
    // side effect
    saveState(getState().app);
  };
}

export function updateAppConfig<K extends keyof StateApp>(name: K, value: StateApp[K]) {
  return (dispatch: DispatchFn, getState: GetStateFn) => {
    dispatch('appUpdateAppConfig', (s) => {
      s.app[name] = value;
    });
    // side effect
    saveState(getState().app);
  };
}

export function updateCollapsibleIsOpen(prefix: string, name: string, v: boolean) {
  return (dispatch: DispatchFn, getState: GetStateFn) => {
    dispatch('updateCollapsibleIsOpen', (s: State) => {
      s.app.collapsibleIsOpen[`${prefix}:${name}`] = v;
    });
    // side effect
    saveStateDebounced(getState().app);
  };
}

/** 一次性展开/收起同一前缀下的多个分组（代理页的「全部收起 / 全部展开」） */
export function updateCollapsibleIsOpenBulk(prefix: string, names: string[], v: boolean) {
  return (dispatch: DispatchFn, getState: GetStateFn) => {
    dispatch('updateCollapsibleIsOpenBulk', (s: State) => {
      for (const name of names) {
        s.app.collapsibleIsOpen[`${prefix}:${name}`] = v;
      }
    });
    // side effect
    saveStateDebounced(getState().app);
  };
}

const defaultClashAPIConfig = {
  baseURL: document.getElementById('app')?.getAttribute('data-base-url') ?? 'http://127.0.0.1:9090',
  secret: '',
  addedAt: 0,
};
// type Theme = 'light' | 'dark';
const defaultState: StateApp = {
  selectedClashAPIConfigIndex: 0,
  clashAPIConfigs: [defaultClashAPIConfig],

  latencyTestUrl: DEFAULT_LATENCY_TEST_URL,
  latencyTestTimeout: 5000,
  latencyTestExpectedStatus: '',
  preferBackendLatencyTestUrl: true,
  providerHealthcheckTimeout: PROVIDER_HEALTHCHECK_TIMEOUT,
  selectedChartStyleIndex: 0,
  theme: 'auto',

  // type { [string]: boolean }
  collapsibleIsOpen: {},
  // how proxies are sorted in a group or provider
  proxySortBy: 'Natural',
  hideUnavailableProxies: false,
  autoCloseOldConns: true,
  logStreamingPaused: false,
  proxiesLayout: 'double',
  proxyGroupByProvider: false,
  tabTitle: {
    enabled: true,
    segments: [
      { id: 'upload', kind: 'upload' },
      { id: 'download', kind: 'download' },
      { id: 'text:default', kind: 'text', text: '·' },
      { id: 'appTitle', kind: 'appTitle' },
    ],
    separator: ' ',
    refreshSeconds: 2,
  },
};

/** 持久化的值来自 localStorage，可能是旧版本写的或被手改过，形状不对就整个回落到默认值 */
function isTabTitleConfig(x: unknown): x is TabTitleConfig {
  if (typeof x !== 'object' || x === null) return false;
  const c = x as Partial<TabTitleConfig>;
  if (typeof c.enabled !== 'boolean' || typeof c.separator !== 'string') return false;
  if (typeof c.refreshSeconds !== 'number' || !(c.refreshSeconds > 0)) return false;
  if (!Array.isArray(c.segments)) return false;
  const ids = new Set<string>();
  for (const seg of c.segments) {
    if (typeof seg?.id !== 'string' || ids.has(seg.id)) return false;
    if (!(TITLE_SEGMENT_KINDS as readonly string[]).includes(seg.kind)) return false;
    if (seg.kind === 'text' ? typeof seg.text !== 'string' : seg.id !== seg.kind) return false;
    ids.add(seg.id);
  }
  return true;
}

function parseConfigQueryString() {
  const { search } = window.location;
  const collector: Record<string, string> = {};
  if (typeof search !== 'string' || search === '') return collector;
  const qs = search.replace(/^\?/, '').split('&');
  for (let i = 0; i < qs.length; i++) {
    const [k, v] = qs[i].split('=');
    collector[k] = decodeURIComponent(v);
  }
  return collector;
}

const backendQueryKeys = ['hostname', 'port', 'secret'];

/**
 * 后端相关的 URL 参数只在本次加载生效一次，用完就从地址栏抹掉。
 * 切换后端是靠整页 reload 实现的（见 selectClashAPIConfig），参数留在地址栏
 * 会让每次 reload 都把刚选中的后端改写回参数指定的地址。
 */
function consumeBackendQueryString() {
  try {
    const url = new URL(window.location.href);
    for (const key of backendQueryKeys) url.searchParams.delete(key);
    window.history.replaceState(null, '', url.href);
  } catch (err) {
    // ignore
  }
}

/**
 * 把 URL 参数指定的后端选中：已存在就选它，不存在就新增一条。
 * 不能就地改写当前选中的那条 —— 那会把用户存下来的后端地址覆盖掉。
 */
function applyBackendQueryString(s: StateApp, query: Record<string, string>, isFirstRun: boolean) {
  const curr = s.clashAPIConfigs[s.selectedClashAPIConfigIndex] ?? defaultClashAPIConfig;

  let url: URL;
  try {
    url = new URL(curr.baseURL);
  } catch (err) {
    url = new URL(defaultClashAPIConfig.baseURL);
  }

  if (query.hostname) {
    if (query.hostname.indexOf('http') === 0) {
      url.href = query.hostname;
    } else {
      url.hostname = query.hostname;
    }
  }
  if (query.port) {
    url.port = query.port;
  }

  // url.href is a stringifier and it appends a trailing slash
  // that is not we want
  const baseURL = trimTrailingSlash(url.href);
  // 没给 secret 时只有地址没变才沿用当前的，别把 A 后端的密钥带到 B 后端上
  const secret = query.secret ?? (baseURL === curr.baseURL ? curr.secret : '');

  // 首次访问时列表里只有一条占位的默认后端，直接顶掉，不要留个连不上的空壳
  if (isFirstRun) {
    s.clashAPIConfigs = [{ baseURL, secret, addedAt: Date.now() }];
    s.selectedClashAPIConfigIndex = 0;
  } else {
    const idx = s.clashAPIConfigs.findIndex((x) => x.baseURL === baseURL && x.secret === secret);
    if (idx >= 0) {
      s.selectedClashAPIConfigIndex = idx;
    } else {
      s.clashAPIConfigs.push({ baseURL, secret, addedAt: Date.now() });
      s.selectedClashAPIConfigIndex = s.clashAPIConfigs.length - 1;
    }
  }

  saveState(s);
  consumeBackendQueryString();
}

export function initialState() {
  const persisted = loadState();
  const s: StateApp = { ...defaultState, ...persisted };
  if (!isTabTitleConfig(s.tabTitle)) s.tabTitle = defaultState.tabTitle;
  const query = parseConfigQueryString();

  if (backendQueryKeys.some((key) => query[key])) {
    applyBackendQueryString(s, query, !persisted);
  }

  if (query.theme === 'dark' || query.theme === 'light') {
    s.theme = query.theme;
  }
  if (query.title) {
    document.title = decodeURIComponent(query.title);
  }
  // set initial theme
  setTheme(s.theme as ThemeType);
  return s;
}
