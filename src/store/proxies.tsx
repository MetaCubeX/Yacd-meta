import { atom } from 'jotai';

/* import { ProxyItem, ProxiesMapping, DelayMapping } from '~/store/types'; */
import {
  DispatchFn,
  FormattedProxyProvider,
  GetStateFn,
  ProxiesMapping,
  ProxyItem,
  ProxyProvider,
  State,
  StateProxies,
  SwitchProxyCtxItem,
} from '~/store/types';
import { ClashAPIConfig } from '~/types';

import * as connAPI from '../api/connections';
import * as proxiesAPI from '../api/proxies';

import {
  getAutoCloseOldConns,
  getLatencyTestExpectedStatus,
  getLatencyTestTimeout,
  getLatencyTestUrl,
  getPreferBackendLatencyTestUrl,
  getProviderHealthcheckTimeout,
} from './app';

export const initialState: StateProxies = {
  proxies: {},
  delay: {},
  groupNames: [],
  showModalClosePrevConns: false,
};

const noop = () => null;

// see all types:
// https://github.com/Dreamacro/clash/blob/master/constant/adapters.go

// const ProxyTypeBuiltin = ['DIRECT', 'GLOBAL', 'REJECT'];
// const ProxyGroupTypes = ['Fallback', 'URLTest', 'Selector', 'LoadBalance'];
// const ProxyTypes = ['Shadowsocks', 'Snell', 'Socks5', 'Http', 'Vmess'];

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

export const getProxies = (s: State) => s.proxies.proxies;
export const getDelay = (s: State) => s.proxies.delay;
export const getProxyGroupNames = (s: State) => s.proxies.groupNames;
export const getProxyProviders = (s: State) => s.proxies.proxyProviders || [];
export const getDangleProxyNames = (s: State) => s.proxies.dangleProxyNames;
export const getShowModalClosePrevConns = (s: State) => s.proxies.showModalClosePrevConns;

// The URL the backend is configured to test a group against: its `testUrl`,
// falling back to the first key of `extra` (extra is keyed by test URL).
function getGroupBackendTestUrl(s: State, groupName: string): string | undefined {
  const g = getProxies(s)[groupName];
  if (!g) return undefined;
  if (g.testUrl) return g.testUrl;
  const keys = g.extra ? Object.keys(g.extra) : [];
  return keys.length > 0 ? keys[0] : undefined;
}

// Resolve the effective latency-test URL for a group test, honoring the
// "prefer backend test URL" setting. Falls back to the panel URL.
function resolveGroupTestUrl(s: State, groupName: string): string {
  if (getPreferBackendLatencyTestUrl(s)) {
    const backendUrl = getGroupBackendTestUrl(s, groupName);
    if (backendUrl) return backendUrl;
  }
  return getLatencyTestUrl(s);
}

export function fetchProxies(apiConfig: ClashAPIConfig) {
  return async (dispatch: any, getState: any) => {
    const [proxiesData, providersData] = await Promise.all([
      proxiesAPI.fetchProxies(apiConfig),
      proxiesAPI.fetchProviderProxies(apiConfig),
    ]);

    const { providers: proxyProviders, proxies: providerProxies } = formatProxyProviders(
      providersData.providers,
    );
    const proxies = { ...providerProxies, ...proxiesData.proxies };
    // providerProxies has providerName set, but proxiesData.proxies overwrites those entries,
    // losing providerName. Restore it for all proxies that came from a provider.
    for (const name of Object.keys(providerProxies)) {
      if (proxies[name]) {
        proxies[name] = { ...proxies[name], providerName: providerProxies[name].providerName };
      }
    }
    const [groupNames, proxyNames] = retrieveGroupNamesFrom(proxies);

    const delayPrev = getDelay(getState());
    const delayNext = { ...delayPrev };

    for (let i = 0; i < proxyNames.length; i++) {
      const name = proxyNames[i];
      const { history } = proxies[name] || { history: [] };
      const h = history[history.length - 1];
      if (h && typeof h.delay === 'number') {
        delayNext[name] = { number: h.delay };
      }
    }

    // proxies that are not from a provider
    const dangleProxyNames = [];
    for (const v of proxyNames) {
      if (!providerProxies[v]) dangleProxyNames.push(v);
    }

    dispatch('store/proxies#fetchProxies', (s: State) => {
      s.proxies.proxies = proxies;
      s.proxies.groupNames = groupNames;
      s.proxies.delay = delayNext;
      s.proxies.proxyProviders = proxyProviders;
      s.proxies.dangleProxyNames = dangleProxyNames;
    });
  };
}

export function updateProviderByName(apiConfig: ClashAPIConfig, name: string) {
  return async (dispatch: DispatchFn) => {
    try {
      await proxiesAPI.updateProviderByName(apiConfig, name);
    } catch (x) {
      // ignore
    }
    // should be optimized
    // but ¯\_(ツ)_/¯
    dispatch(fetchProxies(apiConfig));
  };
}

export function updateProviders(apiConfig: ClashAPIConfig, names: string[]) {
  return async (dispatch: DispatchFn) => {
    for (let i = 0; i < names.length; i++) {
      try {
        await proxiesAPI.updateProviderByName(apiConfig, names[i]);
      } catch (x) {
        // ignore
      }
    }
    // should be optimized
    // but ¯\_(ツ)_/¯
    dispatch(fetchProxies(apiConfig));
  };
}

// Run `fn` with a signal that aborts after `ms`, always clearing the timer.
async function withTimeout(ms: number, fn: (signal: AbortSignal) => Promise<void>) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    await fn(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

async function healthcheckProviderByNameInternal(
  apiConfig: ClashAPIConfig,
  name: string,
  signal?: AbortSignal,
) {
  try {
    await proxiesAPI.healthcheckProviderByName(apiConfig, name, signal);
  } catch (x) {
    // ignore (includes AbortError when the client-side timeout fires)
  }
}

export function healthcheckProviderByName(apiConfig: ClashAPIConfig, name: string) {
  return async (dispatch: DispatchFn, getState: GetStateFn) => {
    await withTimeout(getProviderHealthcheckTimeout(getState()), (signal) =>
      healthcheckProviderByNameInternal(apiConfig, name, signal),
    );
    // should be optimized
    // but ¯\_(ツ)_/¯
    await dispatch(fetchProxies(apiConfig));
  };
}

function updateDelayEntry(
  dispatch: DispatchFn,
  getState: GetStateFn,
  name: string,
  patch: { number?: number; error?: string; testing?: boolean; updatedAt?: number },
) {
  const delayPrev = getDelay(getState());
  const prev = delayPrev[name] || {};
  dispatch('store/proxies#delay', (s: State) => {
    s.proxies.delay = {
      ...delayPrev,
      [name]: {
        ...prev,
        ...patch,
      },
    };
  });
}

async function closeGroupConns(
  apiConfig: ClashAPIConfig,
  groupName: string,
  exceptionItemName: string,
) {
  const res = await connAPI.fetchConns(apiConfig);
  if (!res.ok) {
    console.log('unable to fetch all connections', res.statusText);
    /* throw new Error(); */
  }
  const json = await res.json();
  const connections = json.connections;
  const idsToClose = [];
  for (const conn of connections) {
    if (
      // include the groupName
      conn.chains.indexOf(groupName) > -1 &&
      // but not include the itemName
      conn.chains.indexOf(exceptionItemName) < 0
    ) {
      idsToClose.push(conn.id);
    }
  }

  await Promise.all(idsToClose.map((id) => connAPI.closeConnById(apiConfig, id).catch(noop)));
}

function resolveChain(proxies: ProxiesMapping, groupName: string, itemName: string) {
  const chain = [itemName, groupName];

  let child: ProxyItem;
  let childKey = itemName;
  while ((child = proxies[childKey]) && child.now) {
    chain.unshift(child.now);
    childKey = child.now;
  }
  return chain;
}

async function switchProxyImpl(
  dispatch: DispatchFn,
  getState: GetStateFn,
  apiConfig: ClashAPIConfig,
  groupName: string,
  itemName: string,
) {
  try {
    const res = await proxiesAPI.requestToSwitchProxy(apiConfig, groupName, itemName);
    if (res.ok === false) {
      throw new Error(`failed to switch proxy: res.statusText`);
    }
  } catch (err) {
     
    console.log(err, 'failed to swith proxy');
    throw err;
  }

  dispatch(fetchProxies(apiConfig));
  const autoCloseOldConns = getAutoCloseOldConns(getState());
  if (autoCloseOldConns) {
    // use fresh state
    const proxies = getProxies(getState());
    // no wait
    closePrevConns(apiConfig, proxies, { groupName, itemName });
  }

  /* dispatch('showModalClosePrevConns', (s: GlobalState) => { */
  /*   s.proxies.showModalClosePrevConns = true; */
  /*   s.proxies.switchProxyCtx = { to: { groupName, itemName } }; */
  /* }); */
}

function closeModalClosePrevConns() {
  return (dispatch: DispatchFn) => {
    dispatch('closeModalClosePrevConns', (s: State) => {
      s.proxies.showModalClosePrevConns = false;
    });
  };
}

function closePrevConns(
  apiConfig: ClashAPIConfig,
  proxies: ProxiesMapping,
  switchTo: SwitchProxyCtxItem,
) {
  // we must have fetched the proxies before
  // so the proxies here is fresh
  /* const proxies = s.proxies.proxies; */
  const chain = resolveChain(proxies, switchTo.groupName, switchTo.itemName);
  closeGroupConns(apiConfig, switchTo.groupName, chain[0]);
}

function closePrevConnsAndTheModal(apiConfig: ClashAPIConfig) {
  return async (dispatch: DispatchFn, getState: GetStateFn) => {
    const s = getState();
    const switchTo = s.proxies.switchProxyCtx?.to;
    if (!switchTo) {
      dispatch(closeModalClosePrevConns());
      return;
    }

    // we must have fetched the proxies before
    // so the proxies here is fresh
    const proxies = s.proxies.proxies;
    closePrevConns(apiConfig, proxies, switchTo);

    dispatch('closePrevConnsAndTheModal', (s: State) => {
      s.proxies.showModalClosePrevConns = false;
      s.proxies.switchProxyCtx = undefined;
    });
  };
}

export function switchProxy(apiConfig: ClashAPIConfig, groupName: string, itemName: string) {
  return async (dispatch: DispatchFn, getState: GetStateFn) => {
    // switch proxy asynchronously
    switchProxyImpl(dispatch, getState, apiConfig, groupName, itemName).catch(noop);

    // optimistic UI update
    dispatch('store/proxies#switchProxy', (s) => {
      const proxies = s.proxies.proxies;
      if (proxies[groupName] && proxies[groupName].now) {
        proxies[groupName].now = itemName;
      }
    });
  };
}

function requestDelayForProxyOnce(apiConfig: ClashAPIConfig, name: string) {
  return async (dispatch: DispatchFn, getState: GetStateFn) => {
    let error = '';
    let delayNumber: number | undefined;
    try {
      const latencyTestUrl = getLatencyTestUrl(getState());
      const latencyTestTimeout = getLatencyTestTimeout(getState());
      const expected = getLatencyTestExpectedStatus(getState());
      const res = await proxiesAPI.requestDelayForProxy(apiConfig, name, latencyTestUrl, latencyTestTimeout, expected);
      if (res.ok === false) {
        error = res.statusText;
      }
      const body = await res.json();
      delayNumber = body?.delay;
    } catch (err) {
      error = (err as Error).message;
    }

    const normalizedDelay =
      typeof delayNumber === 'number' && delayNumber > 0 ? delayNumber : undefined;

    updateDelayEntry(dispatch, getState, name, {
      error,
      number: normalizedDelay,
      testing: false,
      updatedAt: Date.now(),
    });
  };
}

export function requestDelayForProxy(apiConfig: ClashAPIConfig, name: string) {
  return async (dispatch: DispatchFn) => {
    await dispatch(requestDelayForProxyOnce(apiConfig, name));
  };
}

export function requestDelayForProxies(apiConfig: ClashAPIConfig, names: string[]) {
  return async (dispatch: DispatchFn, getState: GetStateFn) => {
    const proxyNames = getDangleProxyNames(getState());

    const works = names
      // remove names that are provided by proxy providers
      .filter((p) => proxyNames.indexOf(p) > -1)
      .map((p) => dispatch(requestDelayForProxy(apiConfig, p)));
    await Promise.all(works);
    await dispatch(fetchProxies(apiConfig));
  };
}

// Test latency for a whole group. On Meta backends this uses the single
// `/group/{name}/delay` endpoint (one request for the whole group), resolving
// the test URL via resolveGroupTestUrl (backend-configured URL when preferred).
// On non-Meta backends it falls back to testing each member proxy individually.
export function requestDelayForGroup(
  apiConfig: ClashAPIConfig,
  groupName: string,
  isMeta: boolean,
  memberNames: string[],
) {
  return async (dispatch: DispatchFn, getState: GetStateFn) => {
    if (isMeta) {
      const state = getState();
      const latencyTestUrl = resolveGroupTestUrl(state, groupName);
      const latencyTestTimeout = getLatencyTestTimeout(state);
      const expected = getLatencyTestExpectedStatus(state);
      await proxiesAPI.requestDelayForProxyGroup(
        apiConfig,
        groupName,
        latencyTestUrl,
        latencyTestTimeout,
        expected,
      );
      await dispatch(fetchProxies(apiConfig));
    } else {
      // requestDelayForProxies already refreshes proxies when done
      await dispatch(requestDelayForProxies(apiConfig, memberNames));
    }
  };
}

export function requestDelayAll(apiConfig: ClashAPIConfig) {
  return async (dispatch: DispatchFn, getState: GetStateFn) => {
    const proxyNames = getDangleProxyNames(getState());
    await Promise.all(proxyNames.map((p) => dispatch(requestDelayForProxy(apiConfig, p))));
    const proxyProviders = getProxyProviders(getState());
    const providerHealthcheckTimeout = getProviderHealthcheckTimeout(getState());
    // one by one, each bounded so a slow provider can't stall the whole run
    for (const p of proxyProviders) {
      await withTimeout(providerHealthcheckTimeout, (signal) =>
        healthcheckProviderByNameInternal(apiConfig, p.name, signal),
      );
    }
    await dispatch(fetchProxies(apiConfig));
  };
}

export function healthcheckProxy(apiConfig: ClashAPIConfig, name: string) {
  return async (dispatch: DispatchFn, getState: GetStateFn) => {
    updateDelayEntry(dispatch, getState, name, { testing: true, error: '' });

    let delayNumber: number | undefined;
    let error = '';
    try {
      const proxy = getProxies(getState())[name];
      const providerName = proxy?.providerName;
      const latencyTestUrl = getLatencyTestUrl(getState());
      const latencyTestTimeout = getLatencyTestTimeout(getState());
      const expected = getLatencyTestExpectedStatus(getState());
      const res = providerName
        ? await proxiesAPI.healthcheckProviderProxy(apiConfig, providerName, name, latencyTestUrl, latencyTestTimeout, expected)
        : await proxiesAPI.requestDelayForProxy(apiConfig, name, latencyTestUrl, latencyTestTimeout, expected);
      if (res.ok === false) {
        error = res.statusText;
      }
      const body = await res.json().catch(() => undefined);
      delayNumber = body?.delay;
    } catch (err) {
      error = (err as Error).message || 'Request failed';
    }

    const normalizedDelay =
      typeof delayNumber === 'number' && delayNumber > 0 ? delayNumber : undefined;

    const errorMessage = error || (normalizedDelay === undefined ? 'Timeout' : '');
    updateDelayEntry(dispatch, getState, name, {
      number: normalizedDelay,
      error: errorMessage,
      testing: false,
      updatedAt: Date.now(),
    });
  };
}

function retrieveGroupNamesFrom(proxies: Record<string, ProxyItem>) {
  let groupNames = [];
  let globalAll: string[];
  const proxyNames = [];
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
    // Put GLOBAL in the end
    globalAll.push('GLOBAL');
    // Sort groups according to its index in GLOBAL group
    groupNames = groupNames
      .map((name) => [globalAll.indexOf(name), name])
      .sort((a, b) => a[0] - b[0])
      .map((group) => group[1]);
  }
  return [groupNames, proxyNames];
}

type ProvidersRaw = {
  [key: string]: ProxyProvider;
};

function formatProxyProviders(providersInput: ProvidersRaw): {
  providers: Array<FormattedProxyProvider>;
  proxies: { [key: string]: ProxyItem };
} {
  const keys = Object.keys(providersInput);
  const providers = [];
  const proxies = {};
  for (let i = 0; i < keys.length; i++) {
    const provider: ProxyProvider = providersInput[keys[i]];
    if (provider.name === 'default' || provider.vehicleType === 'Compatible') {
      continue;
    }
    const proxiesArr = provider.proxies;
    const names = [];
    for (let j = 0; j < proxiesArr.length; j++) {
      const proxy = proxiesArr[j];
      proxies[proxy.name] = { ...proxy, providerName: provider.name };
      names.push(proxy.name);
    }

    const formattedProvider = { ...provider, proxies: names };
    providers.push(formattedProvider);
  }

  return {
    providers,
    proxies,
  };
}

export const actions = {
  requestDelayForProxies,
  requestDelayForGroup,
  closeModalClosePrevConns,
  closePrevConnsAndTheModal,
  healthcheckProxy,
};

export const proxyFilterText = atom('');
