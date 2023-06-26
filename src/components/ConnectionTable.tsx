import './ConnectionTable.scss';

import cx from 'clsx';
import { formatDistance, Locale } from 'date-fns';
import { enUS, zhCN, zhTW } from 'date-fns/locale';
import React, { useEffect, useState } from 'react';
import { ChevronDown } from 'react-feather';
import { XCircle } from 'react-feather';
import { useTranslation } from 'react-i18next';
import { useSortBy, useTable } from 'react-table';

import { State } from '~/store/types';

import * as connAPI from '../api/connections';
import prettyBytes from '../misc/pretty-bytes';
import { getClashAPIConfig } from '../store/app';
import s from './ConnectionTable.module.scss';
import MOdalCloseConnection from './ModalCloseAllConnections';
import { connect } from './StateProvider';

const sortById = { id: 'id', desc: true };

function Table({ data, columns, hiddenColumns, apiConfig }) {
  const [operationId, setOperationId] = useState('');
  const [showModalDisconnect, setShowModalDisconnect] = useState(false);
  const tableState = {
    sortBy: [
      // maintain a more stable order
      sortById,
    ],
    hiddenColumns,
  };
  const table = useTable(
    {
      columns,
      data,
      initialState: tableState,
      autoResetSortBy: false,
    },
    useSortBy
  );

  const { getTableProps, setHiddenColumns, headerGroups, rows, prepareRow } = table;

  useEffect(() => {
    setHiddenColumns(hiddenColumns);
  }, [setHiddenColumns, hiddenColumns]);
  const { t, i18n } = useTranslation();

  let locale: Locale;

  if (i18n.language === 'zh-CN') {
    locale = zhCN;
  } else if (i18n.language === 'zh-TW') {
    locale = zhTW;
  } else {
    locale = enUS;
  }

  const disconnectOperation = () => {
    connAPI.closeConnById(apiConfig, operationId);
    setShowModalDisconnect(false);
  };

  const handlerDisconnect = (id) => {
    setOperationId(id);
    setShowModalDisconnect(true);
  };

  const renderCell = (
    cell: { column: { id: string }; row: { original: { id: string } }; value: number },
    locale: Locale
  ) => {
    switch (cell.column.id) {
      case 'ctrl':
        return (
          <XCircle
            style={{ cursor: 'pointer' }}
            onClick={() => handlerDisconnect(cell.row.original.id)}
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
  };

  return (
    <div style={{ marginTop: '5px' }}>
      <table {...getTableProps()} className={cx(s.table, 'connections-table')}>
        <thead>
          {headerGroups.map((headerGroup, trindex) => {
            return (
              <tr {...headerGroup.getHeaderGroupProps()} className={s.tr} key={trindex}>
                {headerGroup.headers.map((column) => (
                  <th {...column.getHeaderProps(column.getSortByToggleProps())} className={s.th}>
                    <span>{t(column.render('Header'))}</span>
                    {column.id !== 'ctrl' ? (
                      <span className={s.sortIconContainer}>
                        {column.isSorted ? (
                          <ChevronDown
                            size={16}
                            className={column.isSortedDesc ? '' : s.rotate180}
                          />
                        ) : null}
                      </span>
                    ) : null}
                  </th>
                ))}
              </tr>
            );
          })}
        </thead>
        <tbody>
          {rows.map((row, i) => {
            prepareRow(row);
            return (
              <tr className={s.tr} key={i}>
                {row.cells.map((cell) => {
                  return (
                    <td
                      {...cell.getCellProps()}
                      className={cx(s.td, i % 2 === 0 ? s.odd : false, cell.column.id)}
                    >
                      {renderCell(cell, locale)}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
      <MOdalCloseConnection
        confirm={'disconnect'}
        isOpen={showModalDisconnect}
        onRequestClose={() => setShowModalDisconnect(false)}
        primaryButtonOnTap={disconnectOperation}
      ></MOdalCloseConnection>
    </div>
  );
}

const mapState = (s: State) => ({
  apiConfig: getClashAPIConfig(s),
});

export default connect(mapState)(Table);
