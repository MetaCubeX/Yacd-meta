import * as React from 'react';
import { useTranslation } from 'react-i18next';

import {
  useCloseConnections,
  useConnectionColumns,
  useConnectionFilters,
  useConnectionSettings,
  useConnectionsStream,
  useConnectionStats,
  useSourceMapState,
} from '~/modules/connections/hooks';
import {
  getDefaultSortDir,
  getInitialSort,
  saveSort,
  sortConns,
  SortState,
} from '~/modules/connections/utils';
import { ClashAPIConfig } from '~/types';

import s from './Connections.module.scss';
import ConnectionSettingsModal from './ConnectionSettingsModal';
import { ConnectionsHeader, ConnTabKey } from './ConnectionsHeader';
import { ConnectionStats } from './ConnectionStats';
import ConnectionTable from './ConnectionTable';
import ModalCloseAllConnections from './ModalCloseAllConnections';

const { useCallback, useState } = React;

type Props = {
  apiConfig: ClashAPIConfig;
};

export default function Connections({ apiConfig }: Props) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<ConnTabKey>('active');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const { sourceMap, setSourceMap } = useSourceMapState();
  const { settings, updateSettings } = useConnectionSettings();
  const { visibleColumns, addColumn, removeColumn, setColumns, resetColumns } =
    useConnectionColumns();

  const {
    conns,
    closedConns,
    total,
    isLoading,
    isRefreshPaused,
    toggleIsRefreshPaused,
    closeAllConnections,
  } = useConnectionsStream(apiConfig);

  const isClosedTab = activeTab === 'closed';

  const {
    filterKeyword,
    setFilterKeyword,
    columnFilters,
    setColumnFilter,
    filterableColumns,
    getFilterOptions,
    filteredConns,
    filteredClosedConns,
    isFiltering,
  } = useConnectionFilters({
    conns,
    closedConns,
    isClosedTab,
    columns: visibleColumns,
    sourceMap,
    settings,
    t,
  });

  const stats = useConnectionStats(conns, total);

  const [sort, setSortState] = useState<SortState>(() => getInitialSort());
  // 点同一列切换升降序，点别的列换列并回到该列的默认方向
  const setSort = useCallback((key: string) => {
    setSortState((prev) => {
      const next: SortState =
        prev.key === key
          ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
          : { key, dir: getDefaultSortDir(key) };
      saveSort(next);
      return next;
    });
  }, []);

  const rows = isClosedTab ? filteredClosedConns : filteredConns;
  const poolSize = isClosedTab ? closedConns.length : conns.length;

  const sortedRows = React.useMemo(() => sortConns(rows, sort), [rows, sort]);

  const { closeConn, closeConns } = useCloseConnections(apiConfig);

  const [isCloseAllModalOpen, setIsCloseAllModalOpen] = useState(false);
  const [isCloseFilteredModalOpen, setIsCloseFilteredModalOpen] = useState(false);

  const handleCloseAll = useCallback(() => {
    closeAllConnections();
    setIsCloseAllModalOpen(false);
  }, [closeAllConnections]);

  const handleCloseFiltered = useCallback(async () => {
    await closeConns(filteredConns);
    setIsCloseFilteredModalOpen(false);
  }, [closeConns, filteredConns]);

  return (
    <div className={s.page}>
      <ConnectionsHeader
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeCount={isLoading ? undefined : filteredConns.length}
        closedCount={isLoading ? undefined : filteredClosedConns.length}
        filterKeyword={filterKeyword}
        setFilterKeyword={setFilterKeyword}
        isRefreshPaused={isRefreshPaused}
        toggleIsRefreshPaused={toggleIsRefreshPaused}
        isFiltering={isFiltering}
        onCloseFiltered={() => setIsCloseFilteredModalOpen(true)}
        onCloseAll={() => setIsCloseAllModalOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <ConnectionStats {...stats} isLoading={isLoading} />

      <div className={s.tableArea}>
        <ConnectionTable
          isLoading={isLoading}
          data={sortedRows}
          totalCount={poolSize}
          columns={visibleColumns}
          sort={sort}
          setSort={setSort}
          isClosed={isClosedTab}
          fullChain={settings.fullChain}
          onCloseConn={closeConn}
          columnFilters={columnFilters}
          setColumnFilter={setColumnFilter}
          filterableColumns={filterableColumns}
          getFilterOptions={getFilterOptions}
        />
      </div>

      <ModalCloseAllConnections
        isOpen={isCloseAllModalOpen}
        primaryButtonOnTap={handleCloseAll}
        onRequestClose={() => setIsCloseAllModalOpen(false)}
      />
      <ModalCloseAllConnections
        confirm={'close_filter_connections'}
        isOpen={isCloseFilteredModalOpen}
        primaryButtonOnTap={handleCloseFiltered}
        onRequestClose={() => setIsCloseFilteredModalOpen(false)}
      />
      <ConnectionSettingsModal
        isOpen={isSettingsOpen}
        onRequestClose={() => setIsSettingsOpen(false)}
        settings={settings}
        updateSettings={updateSettings}
        visibleColumns={visibleColumns}
        addColumn={addColumn}
        removeColumn={removeColumn}
        setColumns={setColumns}
        resetColumns={resetColumns}
        sourceMap={sourceMap}
        setSourceMap={setSourceMap}
      />
    </div>
  );
}
