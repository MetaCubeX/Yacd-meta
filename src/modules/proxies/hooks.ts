import { useAtom } from 'jotai';
import * as React from 'react';

import {
  fetchProxies,
  NonProxyTypes,
  proxyFilterText,
  requestDelayAll,
  updateProviderByName,
  updateProviders,
} from '~/store/proxies';
import {
  DelayMapping,
  DispatchFn,
  FormattedProxyProvider,
  ProxiesMapping,
  ProxyItem,
} from '~/store/types';
import { ClashAPIConfig } from '~/types';

import { splitItemsByLayout } from './utils';

const { useCallback, useEffect, useMemo, useRef, useState } = React;

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
  proxyInfo: ProxyItem
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

function filterStrArr(all: string[], searchText: string) {
  const segments = searchText
    .toLowerCase()
    .split(' ')
    .map((x) => x.trim())
    .filter((x) => !!x);

  if (segments.length === 0) return all;

  return all.filter((name) => {
    let i = 0;
    for (; i < segments.length; i++) {
      const seg = segments[i];
      if (name.toLowerCase().indexOf(seg) > -1) return true;
    }
    return false;
  });
}

function filterAvailableProxiesAndSort(
  all: string[],
  delay: DelayMapping,
  hideUnavailableProxies: boolean,
  filterText: string,
  proxySortBy: string,
  proxies?: ProxiesMapping
) {
  let filtered = [...all];
  if (hideUnavailableProxies) {
    filtered = filterAvailableProxies(all, delay);
  }

  if (typeof filterText === 'string' && filterText !== '') {
    filtered = filterStrArr(filtered, filterText);
  }
  return ProxySortingFns[proxySortBy](filtered, delay, proxies);
}

export function useFilteredAndSorted(
  all: string[],
  delay: DelayMapping,
  hideUnavailableProxies: boolean,
  proxySortBy: string,
  proxies?: ProxiesMapping
) {
  const [filterText] = useAtom(proxyFilterText);
  return useMemo(
    () =>
      filterAvailableProxiesAndSort(
        all,
        delay,
        hideUnavailableProxies,
        filterText,
        proxySortBy,
        proxies
      ),
    [all, delay, hideUnavailableProxies, filterText, proxySortBy, proxies]
  );
}

export function useUpdateProviderItem({
  dispatch,
  apiConfig,
  name,
}: {
  dispatch: DispatchFn;
  apiConfig: ClashAPIConfig;
  name: string;
}) {
  return useCallback(
    () => dispatch(updateProviderByName(apiConfig, name)),
    [apiConfig, dispatch, name]
  );
}

export function useUpdateProviderItems({
  dispatch,
  apiConfig,
  names,
}: {
  dispatch: DispatchFn;
  apiConfig: ClashAPIConfig;
  names: string[];
}): [() => unknown, boolean] {
  const [isLoading, setIsLoading] = useState(false);

  const action = useCallback(async () => {
    if (isLoading) {
      return;
    }

    setIsLoading(true);
    try {
      await dispatch(updateProviders(apiConfig, names));
    } catch (e) {
      // ignore
    }
    setIsLoading(false);
  }, [apiConfig, dispatch, names, isLoading]);

  return [action, isLoading];
}

export function useTestLatencyAction({
  dispatch,
  apiConfig,
}: {
  dispatch: DispatchFn;
  apiConfig: ClashAPIConfig;
}): [() => unknown, boolean] {
  const [isTestingLatency, setIsTestingLatency] = useState(false);
  const requestDelayAllFn = useCallback(() => {
    if (isTestingLatency) return;

    setIsTestingLatency(true);
    dispatch(requestDelayAll(apiConfig)).then(
      () => setIsTestingLatency(false),
      () => setIsTestingLatency(false)
    );
  }, [apiConfig, dispatch, isTestingLatency]);
  return [requestDelayAllFn, isTestingLatency];
}

export function useProxiesPage({
  dispatch,
  apiConfig,
  groupNames,
  proxyProviders,
  proxiesLayout,
}: {
  dispatch: DispatchFn;
  apiConfig: ClashAPIConfig;
  groupNames: string[];
  proxyProviders: FormattedProxyProvider[];
  proxiesLayout: string;
}) {
  const refFetchedTimestamp = useRef<{ startAt?: number; completeAt?: number }>({});

  const fetchProxiesHooked = useCallback(() => {
    refFetchedTimestamp.current.startAt = Date.now();
    dispatch(fetchProxies(apiConfig)).then(() => {
      refFetchedTimestamp.current.completeAt = Date.now();
    });
  }, [apiConfig, dispatch]);

  useEffect(() => {
    fetchProxiesHooked();

    const fn = () => {
      if (
        refFetchedTimestamp.current.startAt &&
        Date.now() - refFetchedTimestamp.current.startAt > 3e4
      ) {
        fetchProxiesHooked();
      }
    };
    window.addEventListener('focus', fn, false);
    return () => window.removeEventListener('focus', fn, false);
  }, [fetchProxiesHooked]);

  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const closeSettingsModal = useCallback(() => {
    setIsSettingsModalOpen(false);
  }, []);
  const openSettingsModal = useCallback(() => {
    setIsSettingsModalOpen(true);
  }, []);

  const [activeTab, setActiveTab] = useState('proxies');
  const handleTabKeyDown = useCallback(
    (tab: string) => (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        setActiveTab(tab);
      }
    },
    []
  );

  const proxyGroups = useMemo(() => {
    const formatted = groupNames.map((name, i) => ({ name, i }));
    return splitItemsByLayout(formatted, proxiesLayout);
  }, [groupNames, proxiesLayout]);

  const providers = useMemo(() => {
    const formatted = proxyProviders.map((item, i) => ({ item, i }));
    return splitItemsByLayout(formatted, proxiesLayout);
  }, [proxyProviders, proxiesLayout]);

  return {
    isSettingsModalOpen,
    openSettingsModal,
    closeSettingsModal,
    activeTab,
    setActiveTab,
    handleTabKeyDown,
    proxyGroups,
    providers,
  };
}
