import { useAtom } from 'jotai';
import * as React from 'react';

import { ConnectionItem } from '~/api/connections';
import * as connAPI from '~/api/connections';
import {
  closedConnectionsState,
  connectionsState,
  connectionsTotalState,
  FormattedConn,
  isRefreshPausedState,
  MAX_CLOSED_CONNECTIONS,
} from '~/store/connections';
import { ClashAPIConfig } from '~/types';

import {
  ALL_SOURCE_IP,
  arrayToIdKv,
  buildHideRegExp,
  CONNECTION_COLUMN_MAP,
  CONNECTION_COLUMNS_DEFAULT,
  ConnectionSettings,
  filterConns,
  formatConnectionDataItem,
  getInitialColumns,
  getInitialSettings,
  getInitialSourceMap,
  getNameFromSource,
  saveColumns,
  saveSettings,
  saveSourceMap,
  SourceMapItem,
} from './utils';

const { useCallback, useEffect, useMemo, useRef, useState } = React;

export function useSourceMapState() {
  const [sourceMap, setSourceMapState] = useState<SourceMapItem[]>(() => getInitialSourceMap());

  const setSourceMap = useCallback((updater: React.SetStateAction<SourceMapItem[]>) => {
    setSourceMapState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      saveSourceMap(next.filter((item) => item.reg || item.name));
      return next;
    });
  }, []);

  return { sourceMap, setSourceMap };
}

export function useConnectionsStream(apiConfig: ClashAPIConfig, sourceMap: SourceMapItem[]) {
  const [conns, setConns] = useAtom(connectionsState);
  const [closedConns, setClosedConns] = useAtom(closedConnectionsState);
  const [isRefreshPaused, setIsRefreshPaused] = useAtom(isRefreshPausedState);
  const [total, setTotal] = useAtom(connectionsTotalState);
  const [reConnectCount, setReConnectCount] = useState(0);
  const prevConnsRef = useRef<FormattedConn[]>(conns);

  const toggleIsRefreshPaused = useCallback(() => {
    setIsRefreshPaused((value) => !value);
  }, [setIsRefreshPaused]);

  const closeAllConnections = useCallback(() => {
    connAPI.closeAllConnections(apiConfig);
  }, [apiConfig]);

  const read = useCallback(
    ({
      connections,
      downloadTotal,
      uploadTotal,
    }: {
      connections: ConnectionItem[];
      downloadTotal?: number;
      uploadTotal?: number;
    }) => {
      // skip all processing while paused or in a background tab; prevConnsRef
      // keeps the last committed snapshot as the baseline, so closed
      // connections are still detected against it on the first message after
      // resuming (speeds may spike for that one tick since the byte delta
      // spans the whole gap)
      if (isRefreshPaused || document.hidden) return;

      const prevConnsKv = arrayToIdKv(prevConnsRef.current);
      const now = Date.now();
      const nextConnections =
        connections?.map((item: ConnectionItem) =>
          formatConnectionDataItem(item, prevConnsKv, now, sourceMap),
        ) ?? [];

      const nextIds = new Set<string>();
      for (const conn of nextConnections) nextIds.add(conn.id);
      const closed: FormattedConn[] = [];
      for (const connection of prevConnsRef.current) {
        if (!nextIds.has(connection.id)) closed.push(connection);
      }

      if (closed.length > 0) {
        setClosedConns((prev) => [...closed, ...prev].slice(0, MAX_CLOSED_CONNECTIONS + 1));
      }

      setTotal((prev) =>
        prev.download === downloadTotal && prev.upload === uploadTotal
          ? prev
          : { download: downloadTotal ?? 0, upload: uploadTotal ?? 0 },
      );

      if (nextConnections.length !== 0 || prevConnsRef.current.length !== 0) {
        prevConnsRef.current = nextConnections;
        setConns(nextConnections);
      }
    },
    [isRefreshPaused, setClosedConns, setConns, setTotal, sourceMap],
  );

  useEffect(() => {
    return connAPI.fetchData(apiConfig, read, () => {
      setTimeout(() => {
        setReConnectCount((prev) => prev + 1);
      }, 1000);
    });
  }, [apiConfig, read, reConnectCount]);

  return {
    conns,
    closedConns,
    total,
    isRefreshPaused,
    toggleIsRefreshPaused,
    closeAllConnections,
  };
}

/** 已启用列（有序）的读写，写入时同步存到 localStorage */
export function useConnectionColumns() {
  const [columns, setColumnsState] = useState<string[]>(() => getInitialColumns());

  const setColumns = useCallback((next: string[]) => {
    setColumnsState(next);
    saveColumns(next);
  }, []);

  const addColumn = useCallback(
    (id: string) => setColumns([...columns, id]),
    [columns, setColumns],
  );

  const removeColumn = useCallback(
    (id: string) => setColumns(columns.filter((each) => each !== id)),
    [columns, setColumns],
  );

  const resetColumns = useCallback(() => setColumns([...CONNECTION_COLUMNS_DEFAULT]), [setColumns]);

  const visibleColumns = useMemo(
    () => columns.map((id) => CONNECTION_COLUMN_MAP[id]).filter(Boolean),
    [columns],
  );

  return {
    columns,
    visibleColumns,
    addColumn,
    removeColumn,
    setColumns,
    resetColumns,
  };
}

/** 隐藏正则 / 完整代理链等页面级设置，写 localStorage */
export function useConnectionSettings() {
  const [settings, setSettingsState] = useState<ConnectionSettings>(() => getInitialSettings());

  const updateSettings = useCallback((patch: Partial<ConnectionSettings>) => {
    setSettingsState((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  return { settings, updateSettings };
}

export function useConnectionFilters({
  conns,
  closedConns,
  sourceMap,
  settings,
  t,
}: {
  conns: FormattedConn[];
  closedConns: FormattedConn[];
  sourceMap: SourceMapItem[];
  settings: ConnectionSettings;
  t: (key: string) => string;
}) {
  const [filterKeyword, setFilterKeyword] = useState('');
  const [filterSourceIpStr, setFilterSourceIpStr] = useState(ALL_SOURCE_IP);

  // conns changes identity every second, but the set of source IPs rarely
  // does — keep the previous array when the contents are unchanged so the
  // connIpSet memo below (and the Select consuming it) doesn't churn
  const sortedIpsRef = useRef<string[]>([]);
  const sourceIps = useMemo(() => {
    const next = Array.from(new Set(conns.map((x) => x.sourceIP))).sort();
    const prev = sortedIpsRef.current;
    if (prev.length === next.length && prev.every((ip, i) => ip === next[i])) {
      return prev;
    }
    sortedIpsRef.current = next;
    return next;
  }, [conns]);

  const hideRegExp = useMemo(() => buildHideRegExp(settings), [settings]);

  const filteredConns = useMemo(
    () => filterConns(conns, filterKeyword, filterSourceIpStr, hideRegExp),
    [conns, filterKeyword, filterSourceIpStr, hideRegExp],
  );
  const filteredClosedConns = useMemo(
    () => filterConns(closedConns, filterKeyword, filterSourceIpStr, hideRegExp),
    [closedConns, filterKeyword, filterSourceIpStr, hideRegExp],
  );

  const connIpSet = useMemo(() => {
    return [
      [ALL_SOURCE_IP, t('All')],
      ...sourceIps.map((value) => [
        value,
        getNameFromSource(value, sourceMap).trim() || t('internel'),
      ]),
    ];
  }, [sourceIps, sourceMap, t]);

  const isFiltering = filterKeyword !== '' || filterSourceIpStr !== ALL_SOURCE_IP;

  return {
    filterKeyword,
    setFilterKeyword,
    filterSourceIpStr,
    setFilterSourceIpStr,
    filteredConns,
    filteredClosedConns,
    connIpSet,
    isFiltering,
  };
}

/** 顶部四张统计卡的数据来源 */
export function useConnectionStats(
  conns: FormattedConn[],
  total: { download: number; upload: number },
) {
  return useMemo(() => {
    let downloadSpeed = 0;
    let uploadSpeed = 0;
    for (const conn of conns) {
      downloadSpeed += conn.downloadSpeedCurr ?? 0;
      uploadSpeed += conn.uploadSpeedCurr ?? 0;
    }
    return {
      activeCount: conns.length,
      downloadSpeed,
      uploadSpeed,
      downloadTotal: total.download,
      uploadTotal: total.upload,
    };
  }, [conns, total]);
}

/** 关闭连接：单条与按当前筛选批量关闭 */
export function useCloseConnections(apiConfig: ClashAPIConfig) {
  const closeConn = useCallback(
    (id: string) => {
      connAPI.closeConnById(apiConfig, id);
    },
    [apiConfig],
  );

  const closeConns = useCallback(
    (conns: FormattedConn[]) =>
      Promise.allSettled(conns.map((conn) => connAPI.closeConnById(apiConfig, conn.id))),
    [apiConfig],
  );

  return { closeConn, closeConns };
}

/** 容器宽度：列宽按它分配剩余空间 */
export function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver((entries) => setWidth(entries[0].contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return [ref, width] as const;
}
