import './ConnectionTable.scss';

import {
  ColumnDef,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
} from '@tanstack/react-table';
import cx from 'clsx';
import { formatDistance, Locale } from 'date-fns';
import { enUS, zhCN, zhTW } from 'date-fns/locale';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { List as VirtualList, RowComponentProps } from 'react-window';

import { ArrowDown, ArrowUp, ChevronDown, Sliders, XCircle } from '~/components/shared/FeatherIcons';
import { FormattedConn } from '~/store/connections';

import * as connAPI from '../api/connections';
import prettyBytes from '../misc/pretty-bytes';

import ConnectionCard from './ConnectionCard';
import s from './ConnectionTable.module.scss';
import MOdalCloseConnection from './ModalCloseAllConnections';
import ModalConnectionDetails from './ModalConnectionDetails';

const sortById = { id: 'id', desc: true };

const COLUMN_WIDTHS = {
  ctrl: 50,
  start: 100,
  type: 120,
  host: 300,
  rule: 200,
  chains: 250,
  download: 100,
  upload: 100,
  downloadSpeedCurr: 100,
  uploadSpeedCurr: 100,
  source: 170,
  destinationIP: 170,
  process: 130,
  sniffHost: 150,
};

const TOTAL_WIDTH = Object.values(COLUMN_WIDTHS).reduce((a, b) => a + b, 0);

const getColumnStyle = (columnId: string) => {
  const width = COLUMN_WIDTHS[columnId] || 100;
  const style: React.CSSProperties = {
    width,
    minWidth: width,
    flex: `0 0 ${width}px`,
    flexShrink: 0,
  };

  if (['download', 'upload', 'downloadSpeedCurr', 'uploadSpeedCurr', 'start'].includes(columnId)) {
    style.justifyContent = 'flex-end';
  }

  if (columnId === 'ctrl') {
    style.justifyContent = 'center';
  }

  return style;
};

function Table({ data, columns, hiddenColumns, apiConfig, height }) {
  const { t, i18n } = useTranslation();
  const [operationId, setOperationId] = useState('');
  const [showModalDisconnect, setShowModalDisconnect] = useState(false);
  const [selectedConn, setSelectedConn] = useState<FormattedConn | null>(null);

  const [isMobile, setIsMobile] = useState(false);

  const headerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 768px)');
    setIsMobile(mql.matches);
    const listener = (e) => setIsMobile(e.matches);
    mql.addEventListener('change', listener);
    return () => mql.removeEventListener('change', listener);
  }, []);

  // react-table v8 列定义：从项目内部的 ConnectionColumn 形态映射而来
  const columnDefs = useMemo<ColumnDef<FormattedConn>[]>(
    () =>
      columns.map((c) => ({
        id: c.accessor,
        accessorFn: (row: FormattedConn) => (row as any)[c.accessor],
        header: c.Header ?? c.accessor,
        enableSorting: c.accessor !== 'ctrl',
        sortDescFirst: c.sortDescFirst ?? false,
      })),
    [columns]
  );

  // 从本地存储加载排序状态（v7 sortBy 与 v8 SortingState 形态一致，可直接复用）
  const [sorting, setSorting] = useState<SortingState>(() => {
    return JSON.parse(localStorage.getItem('tableSortBy')) || [sortById];
  });

  // hiddenColumns 为需隐藏的列 id 列表，转换为 v8 的可见性映射
  const columnVisibility = useMemo<VisibilityState>(
    () => Object.fromEntries(hiddenColumns.map((id: string) => [id, false])),
    [hiddenColumns]
  );

  const table = useReactTable({
    data,
    columns: columnDefs,
    state: { sorting, columnVisibility },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    autoResetAll: false,
  });

  const rows = table.getRowModel().rows;

  const sortOptions = useMemo(() => {
    return columns
      .filter((c) => c.accessor !== 'id' && c.accessor !== 'ctrl')
      .map((c) => ({
        label: t(c.Header),
        value: c.accessor,
      }));
  }, [columns, t]);

  const currentSort = sorting[0] || sortById;

  let locale: Locale;

  if (i18n.language === 'zh-CN') {
    locale = zhCN;
  } else if (i18n.language === 'zh-TW') {
    locale = zhTW;
  } else {
    locale = enUS;
  }

  const disconnectOperation = useCallback(() => {
    connAPI.closeConnById(apiConfig, operationId);
    setShowModalDisconnect(false);
  }, [apiConfig, operationId]);

  const handlerDisconnect = useCallback((id, e) => {
    e.stopPropagation();
    setOperationId(id);
    setShowModalDisconnect(true);
  }, []);

  const renderCell = useCallback(
    (cell, locale) => {
      switch (cell.column.id) {
        case 'ctrl':
          return (
            <XCircle
              style={{ cursor: 'pointer' }}
              onClick={(e) => handlerDisconnect(cell.row.original.id, e)}
            ></XCircle>
          );
        case 'start':
          return formatDistance(cell.getValue(), 0, { locale: locale });
        case 'download':
        case 'upload':
          return prettyBytes(cell.getValue());
        case 'downloadSpeedCurr':
        case 'uploadSpeedCurr':
          return prettyBytes(cell.getValue()) + '/s';
        default:
          return cell.getValue();
      }
    },
    [handlerDisconnect]
  );

  // 当排序状态改变时，将新状态保存到本地存储
  useEffect(() => {
    localStorage.setItem('tableSortBy', JSON.stringify(sorting));
  }, [sorting]);

  const MobileRow = useCallback(
    ({ index, style }: RowComponentProps) => {
      const row = rows[index];
      const conn = row.original as FormattedConn;
      return (
        <div style={style}>
          <ConnectionCard
            key={conn.id}
            conn={conn}
            onDisconnect={handlerDisconnect}
            onClick={() => setSelectedConn(conn)}
          />
        </div>
      );
    },
    [rows, handlerDisconnect]
  );

  const DesktopRow = useCallback(
    ({ index, style }: RowComponentProps) => {
      const row = rows[index];
      return (
        <div
          style={{
            ...style,
            display: 'flex',
            width: TOTAL_WIDTH,
          }}
          className={s.tr}
          onClick={() => setSelectedConn(row.original as FormattedConn)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setSelectedConn(row.original as FormattedConn);
            }
          }}
        >
          {row.getVisibleCells().map((cell) => {
            const columnStyle = getColumnStyle(cell.column.id);
            return (
              <div
                key={cell.id}
                className={cx(s.td, index % 2 === 0 ? s.odd : false, cell.column.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  ...columnStyle,
                }}
              >
                <span className={s.cellText}>{renderCell(cell, locale)}</span>
              </div>
            );
          })}
        </div>
      );
    },
    [rows, renderCell, locale]
  );

  const handleDesktopListScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (headerRef.current) {
      headerRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  }, []);

  return (
    <div className={s.tableWrapper} style={{ height, overflow: 'hidden' }}>
      {isMobile ? (
        <div className={s.cardsView}>
          <div className={s.mobileSortToolbar}>
            <div className={s.sortSelectWrapper}>
              <div className={s.selectedValue}>
                <Sliders size={14} />
                <span>
                  {t('Sort')}: {sortOptions.find((opt) => opt.value === currentSort.id)?.label}
                </span>
              </div>
              <select
                value={currentSort.id}
                onChange={(e) => setSorting([{ id: e.target.value, desc: currentSort.desc }])}
              >
                {sortOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className={s.selectArrow} />
            </div>
            <button
              className={s.sortDirBtn}
              onClick={() => setSorting([{ id: currentSort.id, desc: !currentSort.desc }])}
            >
              {currentSort.desc ? <ArrowDown size={18} /> : <ArrowUp size={18} />}
            </button>
          </div>
          <VirtualList
            style={{ height: height - 50, width: '100%' }}
            rowCount={rows.length}
            rowHeight={120}
            rowComponent={MobileRow}
            rowProps={{}}
          />
        </div>
      ) : (
        <div
          className={cx(s.table, 'connections-table')}
          style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            width: '100%',
          }}
        >
          <div
            className={s.theadWrapper}
            ref={headerRef}
            style={{ overflow: 'hidden', width: '100%' }}
          >
            <div className={s.thead} style={{ width: TOTAL_WIDTH }}>
              {table.getHeaderGroups().map((headerGroup) => (
                <div className={s.tr} key={headerGroup.id} style={{ display: 'flex' }}>
                  {headerGroup.headers.map((header) => {
                    const columnStyle = getColumnStyle(header.column.id);
                    const sortDir = header.column.getIsSorted();
                    const canSort = header.column.getCanSort();
                    const sortHandler = header.column.getToggleSortingHandler();
                    return (
                      <div
                        key={header.id}
                        className={s.th}
                        onClick={sortHandler}
                        onKeyDown={
                          canSort
                            ? (e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  sortHandler?.(e);
                                }
                              }
                            : undefined
                        }
                        role={canSort ? 'button' : undefined}
                        tabIndex={canSort ? 0 : undefined}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          cursor: canSort ? 'pointer' : 'default',
                          ...columnStyle,
                        }}
                      >
                        <span className={s.headerText}>
                          {t(header.column.columnDef.header as string)}
                        </span>
                        {header.column.id !== 'ctrl' ? (
                          <span className={s.sortIconContainer}>
                            {sortDir ? (
                              <ChevronDown
                                size={14}
                                className={sortDir === 'desc' ? '' : s.rotate180}
                              />
                            ) : null}
                          </span>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          <VirtualList
            style={{ height: height - 50, width: '100%' }}
            onScroll={handleDesktopListScroll}
            rowCount={rows.length}
            rowHeight={44}
            rowComponent={DesktopRow}
            rowProps={{}}
          />
        </div>
      )}
      <MOdalCloseConnection
        confirm={'disconnect'}
        isOpen={showModalDisconnect}
        onRequestClose={() => setShowModalDisconnect(false)}
        primaryButtonOnTap={disconnectOperation}
      ></MOdalCloseConnection>
      <ModalConnectionDetails
        isOpen={!!selectedConn}
        onRequestClose={() => setSelectedConn(null)}
        connection={selectedConn}
      />
    </div>
  );
}

export default Table;
