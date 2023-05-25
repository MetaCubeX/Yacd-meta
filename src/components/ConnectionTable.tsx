import cx from 'clsx';
import { formatDistance, Locale } from 'date-fns';
import { enUS, zhCN, zhTW } from 'date-fns/locale';
import React from 'react';
import { ChevronDown } from 'react-feather';
import { useTranslation } from 'react-i18next';
import { useSortBy, useTable } from 'react-table';

import prettyBytes from '../misc/pretty-bytes';
import s from './ConnectionTable.module.scss';

const sortDescFirst = true;

const columns = [
  { accessor: 'id', show: false },
  { Header: 'c_type', accessor: 'type' },
  { Header: 'c_process', accessor: 'process' },
  { Header: 'c_host', accessor: 'host' },
  { Header: 'c_rule', accessor: 'rule' },
  { Header: 'c_chains', accessor: 'chains' },
  { Header: 'c_time', accessor: 'start' },
  { Header: 'c_dl_speed', accessor: 'downloadSpeedCurr', sortDescFirst },
  { Header: 'c_ul_speed', accessor: 'uploadSpeedCurr', sortDescFirst },
  { Header: 'c_dl', accessor: 'download', sortDescFirst },
  { Header: 'c_ul', accessor: 'upload', sortDescFirst },
  { Header: 'c_source', accessor: 'source' },
  { Header: 'c_destination_ip', accessor: 'destinationIP' },
  { Header: 'c_sni', accessor: 'sniffHost' },
];

function renderCell(cell: { column: { id: string }; value: number }, locale: Locale) {
  switch (cell.column.id) {
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
}

const sortById = { id: 'id', desc: true };
const tableState = {
  sortBy: [
    // maintain a more stable order
    sortById,
  ],
  hiddenColumns: ['id'],
};

function Table({ data }) {
  const { getTableProps, headerGroups, rows, prepareRow } = useTable(
    {
      columns,
      data,
      initialState: tableState,
      autoResetSortBy: false,
    },
    useSortBy
  );

  const { t, i18n } = useTranslation();

  let locale: Locale;

  if (i18n.language === 'zh-CN') {
    locale = zhCN;
  } else if (i18n.language === 'zh-TW') {
    locale = zhTW;
  } else {
    locale = enUS;
  }

  return (
    <div {...getTableProps()}>
      {headerGroups.map((headerGroup) => {
        return (
          <div {...headerGroup.getHeaderGroupProps()} className={s.tr}>
            {headerGroup.headers.map((column, index) => (
              <div
                {...column.getHeaderProps(column.getSortByToggleProps())}
                className={index == 0 || (index >= 5 && index < 10) ? s.thdu : s.th}
              >
                <span>{t(column.render('Header'))}</span>
                <span className={s.sortIconContainer}>
                  {column.isSorted ? (
                    <span className={column.isSortedDesc ? '' : s.rotate180}>
                      <ChevronDown size={16} />
                    </span>
                  ) : null}
                </span>
              </div>
            ))}

            {rows.map((row, i) => {
              prepareRow(row);
              return row.cells.map((cell, j) => {
                return (
                  <div
                    {...cell.getCellProps()}
                    className={cx(
                      s.td,
                      i % 2 === 0 ? s.odd : false,
                      j == 0 || (j >= 5 && j < 10) ? s.center : true
                      // j ==1 ? s.break : true
                    )}
                  >
                    {renderCell(cell, locale)}
                  </div>
                );
              });
            })}
          </div>
        );
      })}
    </div>
  );
}

export default Table;
