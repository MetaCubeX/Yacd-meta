import { useAtom } from 'jotai';
import * as React from 'react';

import { ConnectionItem } from '~/api/connections';
import * as connAPI from '~/api/connections';
import {
  closedConnectionsState,
  connectionsState,
  FormattedConn,
  isRefreshPausedState,
  MAX_CLOSED_CONNECTIONS,
} from '~/store/connections';
import { ClashAPIConfig } from '~/types';

import {
  ALL_SOURCE_IP,
  arrayToIdKv,
  CONNECTION_COLUMNS_DEFAULT,
  ConnectionColumn,
  filterConns,
  formatConnectionDataItem,
  getInitialColumns,
  getInitialHiddenColumns,
  getInitialSourceMap,
  getNameFromSource,
  HIDDEN_COLUMNS_DEFAULT,
  saveColumns,
  saveHiddenColumns,
  saveSourceMap,
  SourceMapItem,
} from './utils';

const { useCallback, useEffect, useMemo, useRef, useState } = React;

export function useSourceMapState() {
  const [sourceMapModal, setSourceMapModal] = useState(false);
  const [sourceMap, setSourceMap] = useState<SourceMapItem[]>(() => getInitialSourceMap());

  const openModalSource = useCallback(() => {
    setSourceMap((prev) => (prev.length === 0 ? [{ reg: '', name: '' }] : prev));
    setSourceMapModal(true);
  }, []);

  const closeModalSource = useCallback(() => {
    setSourceMap((prev) => {
      const nextSourceMap = prev.filter((item) => item.reg || item.name);
      saveSourceMap(nextSourceMap);
      return nextSourceMap;
    });
    setSourceMapModal(false);
  }, []);

  return {
    sourceMap,
    setSourceMap,
    sourceMapModal,
    openModalSource,
    closeModalSource,
  };
}

export function useConnectionsStream(apiConfig: ClashAPIConfig, sourceMap: SourceMapItem[]) {
  const [conns, setConns] = useAtom(connectionsState);
  const [closedConns, setClosedConns] = useAtom(closedConnectionsState);
  const [isRefreshPaused, setIsRefreshPaused] = useAtom(isRefreshPausedState);
  const [reConnectCount, setReConnectCount] = useState(0);
  const prevConnsRef = useRef<FormattedConn[]>(conns);

  const toggleIsRefreshPaused = useCallback(() => {
    setIsRefreshPaused((value) => !value);
  }, [setIsRefreshPaused]);

  const closeAllConnections = useCallback(() => {
    connAPI.closeAllConnections(apiConfig);
  }, [apiConfig]);

  const read = useCallback(
    ({ connections }: { connections: ConnectionItem[] }) => {
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
          formatConnectionDataItem(item, prevConnsKv, now, sourceMap)
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

      if (nextConnections.length !== 0 || prevConnsRef.current.length !== 0) {
        prevConnsRef.current = nextConnections;
        setConns(nextConnections);
      }
    },
    [isRefreshPaused, setClosedConns, setConns, sourceMap]
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
    isRefreshPaused,
    toggleIsRefreshPaused,
    closeAllConnections,
  };
}

export function useConnectionColumns() {
  const [hiddenColumns, setHiddenColumnsState] = useState<string[]>(() =>
    getInitialHiddenColumns()
  );
  const [columns, setColumnsState] = useState<ConnectionColumn[]>(() => getInitialColumns());

  const setHiddenColumns = useCallback((nextHiddenColumns: string[]) => {
    setHiddenColumnsState(nextHiddenColumns);
    saveHiddenColumns(nextHiddenColumns);
  }, []);

  const setColumns = useCallback((nextColumns: ConnectionColumn[]) => {
    setColumnsState(nextColumns);
    saveColumns(nextColumns);
  }, []);

  const resetColumns = useCallback(() => {
    setHiddenColumnsState([...HIDDEN_COLUMNS_DEFAULT]);
    setColumnsState([...CONNECTION_COLUMNS_DEFAULT]);
    saveHiddenColumns([...HIDDEN_COLUMNS_DEFAULT]);
    saveColumns([...CONNECTION_COLUMNS_DEFAULT]);
  }, []);

  return {
    hiddenColumns,
    columns,
    setHiddenColumns,
    setColumns,
    resetColumns,
  };
}

export function useConnectionFilters({
  conns,
  closedConns,
  sourceMap,
  t,
}: {
  conns: FormattedConn[];
  closedConns: FormattedConn[];
  sourceMap: SourceMapItem[];
  t: (key: string) => string;
}) {
  const [filterKeyword, setFilterKeyword] = useState('');
  const [filterSourceIpStr, setFilterSourceIpStr] = useState(ALL_SOURCE_IP);

  const filteredConns = useMemo(
    () => filterConns(conns, filterKeyword, filterSourceIpStr),
    [conns, filterKeyword, filterSourceIpStr]
  );
  const filteredClosedConns = useMemo(
    () => filterConns(closedConns, filterKeyword, filterSourceIpStr),
    [closedConns, filterKeyword, filterSourceIpStr]
  );

  const connIpSet = useMemo(() => {
    return [
      [ALL_SOURCE_IP, t('All')],
      ...Array.from(new Set(conns.map((x) => x.sourceIP)))
        .sort()
        .map((value) => [value, getNameFromSource(value, sourceMap).trim() || t('internel')]),
    ];
  }, [conns, sourceMap, t]);

  return {
    filterKeyword,
    setFilterKeyword,
    filterSourceIpStr,
    setFilterSourceIpStr,
    filteredConns,
    filteredClosedConns,
    connIpSet,
  };
}
