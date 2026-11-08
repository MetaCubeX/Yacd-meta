import { useAtomValue, useSetAtom } from 'jotai';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

import * as connAPI from '~/api/connections';
import { fetchData as fetchMemory } from '~/api/memory';
import { fetchData as fetchTraffic } from '~/api/traffic';
import { useVersionNoSuspense } from '~/hooks/useVersion';
import { currentTabTitleAtom } from '~/store/title';
import type { TabTitleConfig } from '~/store/types';
import type { ClashAPIConfig } from '~/types';

import { formatTabTitle, liveSourcesOf, type LiveValues } from './utils';

const { useEffect, useMemo, useState } = React;

/**
 * useLiveValues subscribes only to the streams that are turned on and reports one reading per
 * interval: rates are the mean of the samples pushed in it, totals and counts the latest sample.
 * Each interval starts empty, so a stalled stream turns into undefined instead of a frozen value.
 */
function useLiveValues(
  apiConfig: ClashAPIConfig,
  sources: { traffic: boolean; connections: boolean; memory: boolean },
  intervalMs: number,
) {
  const [values, setValues] = useState<LiveValues>({});
  const { traffic, connections, memory } = sources;

  useEffect(() => {
    if (!traffic && !connections && !memory) {
      setValues({});
      return;
    }

    let up = 0;
    let down = 0;
    let samples = 0;
    let conns: Pick<LiveValues, 'uploadTotal' | 'downloadTotal' | 'connections'> | null = null;
    let inuse: number | null = null;
    const unsubscribes: Array<() => void> = [];

    if (traffic) {
      unsubscribes.push(
        fetchTraffic(apiConfig).subscribe((o: { up: number; down: number }) => {
          up += o.up;
          down += o.down;
          samples += 1;
        }),
      );
    }
    if (connections) {
      const unsubscribe = connAPI.fetchData(
        apiConfig,
        (d) => {
          if (!d) return;
          conns = {
            uploadTotal: d.uploadTotal,
            downloadTotal: d.downloadTotal,
            connections: d.connections?.length ?? 0,
          };
        },
        () => {},
      );
      if (unsubscribe) unsubscribes.push(unsubscribe);
    }
    if (memory) {
      unsubscribes.push(
        fetchMemory(apiConfig).subscribe((o: { inuse: number }) => {
          // mihomo 的 /memory 第一帧固定是 0，不是真实读数
          if (o.inuse > 0) inuse = o.inuse;
        }),
      );
    }

    const timer = setInterval(() => {
      setValues({
        ...(samples > 0
          ? { upload: Math.round(up / samples), download: Math.round(down / samples) }
          : null),
        ...conns,
        ...(inuse !== null ? { memory: inuse } : null),
      });
      up = 0;
      down = 0;
      samples = 0;
      conns = null;
      inuse = null;
    }, intervalMs);

    return () => {
      clearInterval(timer);
      unsubscribes.forEach((f) => f());
    };
  }, [apiConfig, traffic, connections, memory, intervalMs]);

  return values;
}

/** useTabTitle keeps document.title in sync with the tab title settings. */
export function useTabTitle(apiConfig: ClashAPIConfig, config: TabTitleConfig) {
  const { t } = useTranslation();
  // 挂载前 initialState 已按 ?title= 设好 document.title（没给就是 index.html 里的 yacd）
  const [appTitle] = useState(() => document.title);
  const setCurrentTitle = useSetAtom(currentTabTitleAtom);

  const sources = useMemo(
    () =>
      config.enabled
        ? liveSourcesOf(config.segments)
        : { traffic: false, connections: false, memory: false },
    [config.enabled, config.segments],
  );
  const live = useLiveValues(apiConfig, sources, config.refreshSeconds * 1000);
  const version = useVersionNoSuspense(apiConfig);

  const backend = useMemo(() => {
    try {
      return new URL(apiConfig.baseURL).host;
    } catch {
      return apiConfig.baseURL;
    }
  }, [apiConfig.baseURL]);

  const title = formatTabTitle(config, live, { backend, version: version?.version, appTitle }, t);

  useEffect(() => {
    document.title = title;
    setCurrentTitle(title);
  }, [title, setCurrentTitle]);
}

/** The tab title currently shown, for previews. */
export function useCurrentTabTitle() {
  return useAtomValue(currentTabTitleAtom);
}
