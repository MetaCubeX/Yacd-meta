import { useAtom } from 'jotai';
import * as React from 'react';

import { ConnectionItem } from '~/api/connections';
import * as connAPI from '~/api/connections';
import {
  closedConnectionsState,
  connectionsState,
  connectionsReceivedState,
  connectionsTotalState,
  FormattedConn,
  isRefreshPausedState,
  MAX_CLOSED_CONNECTIONS,
} from '~/store/connections';
import { ClashAPIConfig } from '~/types';

import {
  applyColumnFilters,
  applySourceNames,
  arrayToIdKv,
  buildHideRegExp,
  collectFilterOptions,
  ColumnFilterOption,
  ColumnFilters,
  CONNECTION_COLUMN_MAP,
  CONNECTION_COLUMNS_DEFAULT,
  ConnectionColumn,
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
  toActiveColumnFilters,
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

export function useConnectionsStream(apiConfig: ClashAPIConfig) {
  const [conns, setConns] = useAtom(connectionsState);
  const [closedConns, setClosedConns] = useAtom(closedConnectionsState);
  const [isRefreshPaused, setIsRefreshPaused] = useAtom(isRefreshPausedState);
  const [total, setTotal] = useAtom(connectionsTotalState);
  const [isReceived, setIsReceived] = useAtom(connectionsReceivedState);
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

      setIsReceived(true);
      const prevConnsKv = arrayToIdKv(prevConnsRef.current);
      const now = Date.now();
      const nextConnections =
        connections?.map((item: ConnectionItem) =>
          formatConnectionDataItem(item, prevConnsKv, now),
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
    [isRefreshPaused, setClosedConns, setConns, setTotal, setIsReceived],
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
    /** 首条消息之前为 true；暂停或页面在后台时消息被跳过，也算没到 */
    isLoading: !isReceived,
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

/**
 * 关键字、隐藏正则和列头筛选。
 *
 * 列筛选只对 columns（当前显示的列）生效；某列被隐藏时，它的筛选会被清掉，
 * 免得留下一个看不见的筛选条件。
 */
export function useConnectionFilters({
  conns,
  closedConns,
  isClosedTab,
  columns,
  sourceMap,
  settings,
  t,
}: {
  conns: FormattedConn[];
  closedConns: FormattedConn[];
  isClosedTab: boolean;
  columns: ConnectionColumn[];
  sourceMap: SourceMapItem[];
  settings: ConnectionSettings;
  t: (key: string) => string;
}) {
  const [filterKeyword, setFilterKeyword] = useState('');
  const [columnFilters, setColumnFilters] = useState<ColumnFilters>({});

  const filterableColumns = useMemo(() => columns.filter((c) => c.filterValues), [columns]);

  useEffect(() => {
    const visible = new Set(filterableColumns.map((c) => c.id));
    setColumnFilters((prev) => {
      const stale = Object.keys(prev).filter((id) => !visible.has(id));
      if (stale.length === 0) return prev;
      const next = { ...prev };
      for (const id of stale) delete next[id];
      return next;
    });
  }, [filterableColumns]);

  const setColumnFilter = useCallback((columnId: string, values: string[]) => {
    setColumnFilters((prev) => {
      const next = { ...prev };
      if (values.length > 0) next[columnId] = values;
      else delete next[columnId];
      return next;
    });
  }, []);

  const activeColumnFilters = useMemo(
    () => toActiveColumnFilters(columnFilters, filterableColumns),
    [columnFilters, filterableColumns],
  );

  const hideRegExp = useMemo(() => buildHideRegExp(settings), [settings]);

  const namedConns = useMemo(() => applySourceNames(conns, sourceMap), [conns, sourceMap]);
  const namedClosedConns = useMemo(
    () => applySourceNames(closedConns, sourceMap),
    [closedConns, sourceMap],
  );

  // 只过了关键字和隐藏正则的行，列筛选的候选项从这里算
  const baseConns = useMemo(
    () => filterConns(namedConns, filterKeyword, hideRegExp),
    [namedConns, filterKeyword, hideRegExp],
  );
  const baseClosedConns = useMemo(
    () => filterConns(namedClosedConns, filterKeyword, hideRegExp),
    [namedClosedConns, filterKeyword, hideRegExp],
  );

  const filteredConns = useMemo(
    () => applyColumnFilters(baseConns, activeColumnFilters),
    [baseConns, activeColumnFilters],
  );
  const filteredClosedConns = useMemo(
    () => applyColumnFilters(baseClosedConns, activeColumnFilters),
    [baseClosedConns, activeColumnFilters],
  );

  const tabBaseConns = isClosedTab ? baseClosedConns : baseConns;

  /**
   * 某列筛选面板的候选项。和 Excel 一样，候选来自经过其他列筛选后的行，
   * 不受这一列自己的筛选影响，否则勾了一项之后其余项就全消失了。
   */
  const getFilterOptions = useCallback(
    (columnId: string): ColumnFilterOption[] => {
      const column = CONNECTION_COLUMN_MAP[columnId];
      if (!column) return [];
      const rows = applyColumnFilters(tabBaseConns, activeColumnFilters, columnId);
      const options = collectFilterOptions(rows, column, columnFilters[columnId] ?? []);
      if (columnId !== 'source') return options;
      return options.map((o) => ({
        ...o,
        label: getNameFromSource(o.value, sourceMap).trim() || t('internel'),
      }));
    },
    [tabBaseConns, activeColumnFilters, columnFilters, sourceMap, t],
  );

  const isFiltering = filterKeyword !== '' || activeColumnFilters.length > 0;

  return {
    filterKeyword,
    setFilterKeyword,
    columnFilters,
    setColumnFilter,
    filterableColumns,
    getFilterOptions,
    filteredConns,
    filteredClosedConns,
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
