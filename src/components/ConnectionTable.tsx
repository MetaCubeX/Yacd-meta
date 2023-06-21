import cx from 'clsx';
import { formatDistance, Locale } from 'date-fns';
import { enUS, zhCN, zhTW } from 'date-fns/locale';
import React, { useState } from 'react';
import { DragDropContext, Draggable, Droppable } from 'react-beautiful-dnd';
import { ChevronDown } from 'react-feather';
import { useTranslation } from 'react-i18next';
import { useSortBy, useTable } from 'react-table';

import BaseModal from '~/components/shared/BaseModal';

import prettyBytes from '../misc/pretty-bytes';
import Button from './Button';
import s from './ConnectionTable.module.scss';
import Switch from './SwitchThemed';

const sortDescFirst = true;

const getItemStyle = (isDragging, draggableStyle) => {
  return {
    ...draggableStyle,
    ...(isDragging && {
      background: 'transparent',
      transform: draggableStyle.transform, // modal基于transform会造成偏移
    }),
  };
};

const hiddenColumnsOrigin = JSON.stringify(['id']);
const columnsOrigin = JSON.stringify([
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
]);

const savedHiddenColumns = localStorage.getItem('hiddenColumns');
const savedColumns = localStorage.getItem('columns');

const hiddenColumns = savedHiddenColumns
  ? JSON.parse(savedHiddenColumns)
  : JSON.parse(hiddenColumnsOrigin);
const columnsInit = savedColumns ? JSON.parse(savedColumns) : JSON.parse(columnsOrigin);

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
  hiddenColumns,
};

function Table({ data }) {
  const [showModalColumn, setModalColumn] = useState(false);
  const [columns, setColumns] = useState(columnsInit);
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
  const { t, i18n } = useTranslation();

  let locale: Locale;

  if (i18n.language === 'zh-CN') {
    locale = zhCN;
  } else if (i18n.language === 'zh-TW') {
    locale = zhTW;
  } else {
    locale = enUS;
  }

  const closeModalColumn = () => {
    setModalColumn(false);
  };

  const onShowChange = (column, val) => {
    if (!val) {
      hiddenColumns.push(column.accessor);
    } else {
      const idx = hiddenColumns.indexOf(column.accessor);

      hiddenColumns.splice(idx, 1);
    }
    setHiddenColumns(Array.from(hiddenColumns));
    localStorage.setItem('hiddenColumns', JSON.stringify(hiddenColumns));
  };

  const resetColumns = () => {
    hiddenColumns.splice(0, hiddenColumns.length);
    hiddenColumns.push('id');
    setHiddenColumns(hiddenColumns);
    setColumns(JSON.parse(columnsOrigin));
    localStorage.removeItem('hiddenColumns');
    localStorage.removeItem('columns');
  };

  const onDragEnd = (result) => {
    if (!result.destination) {
      return;
    }

    const items = Array.from(columns);
    const [removed] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, removed);
    setColumns(items);
    localStorage.setItem('columns', JSON.stringify(items));
  };

  return (
    <div style={{ marginTop: '5px' }}>
      <BaseModal isOpen={showModalColumn} onRequestClose={closeModalColumn}>
        <div>
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="droppable-modal">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef}>
                  {columns
                    .filter((i) => i.accessor !== 'id')
                    .map((column) => {
                      const show = !hiddenColumns.includes(column.accessor);

                      return (
                        <Draggable
                          key={column.accessor}
                          draggableId={column.accessor}
                          index={columns.findIndex((a) => a.accessor === column.accessor)}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={s.columnManagerRow}
                              style={getItemStyle(
                                snapshot.isDragging,
                                provided.draggableProps.style
                              )}
                            >
                              <span>{t(column.Header)}</span>
                              <div style={{ transform: 'scale(0.7)', height: '20px' }}>
                                <Switch
                                  size="mini"
                                  checked={show}
                                  onChange={(val) => onShowChange(column, val)}
                                />
                              </div>
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>
      </BaseModal>
      <div className={s.btnSection}>
        <Button onClick={() => setModalColumn(true)}>{t('manage_column')}</Button>
        <Button onClick={resetColumns}>{t('reset_column')}</Button>
      </div>
      <table {...getTableProps()} className={s.table}>
        <thead>
          {headerGroups.map((headerGroup, trindex) => {
            return (
              <tr {...headerGroup.getHeaderGroupProps()} className={s.tr} key={trindex}>
                {headerGroup.headers.map((column) => (
                  <th {...column.getHeaderProps(column.getSortByToggleProps())} className={s.th}>
                    <span>{t(column.render('Header'))}</span>
                    <span className={s.sortIconContainer}>
                      {column.isSorted ? (
                        <ChevronDown size={16} className={column.isSortedDesc ? '' : s.rotate180} />
                      ) : null}
                    </span>
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
                {row.cells.map((cell, j) => {
                  return (
                    <td
                      {...cell.getCellProps()}
                      className={cx(
                        s.td,
                        i % 2 === 0 ? s.odd : false,
                        j == 0 || (j >= 5 && j < 10) ? s.center : true
                        // j ==1 ? s.break : true
                      )}
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
    </div>
  );
}

export default Table;
