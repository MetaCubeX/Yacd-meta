import './ConnectionTable.scss';

import cx from 'clsx';
import { formatDistance, Locale } from 'date-fns';
import { enUS, zhCN, zhTW } from 'date-fns/locale';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSortBy, useTable } from 'react-table';
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

  // 从本地存储加载排序状态
  const tableState = useMemo(() => {
    const savedSortBy = JSON.parse(localStorage.getItem('tableSortBy')) || [sortById];
    return {
      sortBy: savedSortBy,
      hiddenColumns,
    };
  }, [hiddenColumns]);

  const table = useTable(
    {
      columns,
      data,
      initialState: tableState,
      autoResetSortBy: false,
    },
    useSortBy
  );

  const { setHiddenColumns, headerGroups, rows, prepareRow, toggleSortBy } = table;
  const state = table.state;

  const sortOptions = useMemo(() => {
    return columns
      .filter((c) => c.accessor !== 'id' && c.accessor !== 'ctrl')
      .map((c) => ({
        label: t(c.Header),
        value: c.accessor,
      }));
  }, [columns, t]);

  const currentSort = state.sortBy[0] || sortById;

  useEffect(() => {
    setHiddenColumns(hiddenColumns);
  }, [setHiddenColumns, hiddenColumns]);

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
          return formatDistance(cell.value, 0, { locale: locale });
        case 'download':
        case 'upload':
          return prettyBytes(cell.value);
        case 'downloadSpeedCurr':
        case 'uploadSpeedCurr':
          return prettyBytes(cell.value) + '/s';
        default:
          return cell.value;
      }
    },
    [handlerDisconnect]
  );

  // 当排序状态改变时，将新状态保存到本地存储
  useEffect(() => {
    localStorage.setItem('tableSortBy', JSON.stringify(state.sortBy));
  }, [state.sortBy]);

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
      prepareRow(row);
      return (
        <div
          {...(row as any).getRowProps({
            style: {
              ...style,
              display: 'flex',
              width: TOTAL_WIDTH,
            },
          })}
          className={s.tr}
          onClick={() => setSelectedConn((row as any).original)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setSelectedConn((row as any).original);
            }
          }}
        >
          {row.cells.map((cell) => {
            const columnStyle = getColumnStyle(cell.column.id);
            return (
              <div
                {...cell.getCellProps()}
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
    [prepareRow, rows, renderCell, locale]
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
                onChange={(e) => toggleSortBy(e.target.value, currentSort.desc)}
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
              onClick={() => toggleSortBy(currentSort.id, !currentSort.desc)}
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
              {headerGroups.map((headerGroup, trindex) => (
                <div
                  {...headerGroup.getHeaderGroupProps()}
                  className={s.tr}
                  key={trindex}
                  style={{ display: 'flex' }}
                >
                  {headerGroup.headers.map((column) => {
                    const columnStyle = getColumnStyle(column.id);
                    return (
                      <div
                        {...column.getHeaderProps(column.getSortByToggleProps())}
                        className={s.th}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          ...columnStyle,
                        }}
                      >
                        <span className={s.headerText}>{t(column.render('Header'))}</span>
                        {column.id !== 'ctrl' ? (
                          <span className={s.sortIconContainer}>
                            {column.isSorted ? (
                              <ChevronDown
                                size={14}
                                className={column.isSortedDesc ? '' : s.rotate180}
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
