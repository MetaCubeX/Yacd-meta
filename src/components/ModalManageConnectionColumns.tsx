import React from 'react';
import { DragDropContext, Draggable, Droppable } from 'react-beautiful-dnd';
import { Menu } from 'react-feather';
import { useTranslation } from 'react-i18next';

import BaseModal from '~/components/shared/BaseModal';

import s from './ModalManageConnectionColumns.module.scss';
import Switch from './SwitchThemed';

const getItemStyle = (isDragging, draggableStyle) => {
  return {
    ...draggableStyle,
    ...(isDragging && {
      background: 'transparent',
    }),
  };
};

export default function ModalManageConnectionColumns({
  isOpen,
  onRequestClose,
  columns,
  hiddenColumns,
  setColumns,
  setHiddenColumns,
}) {
  const { t } = useTranslation();

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

  return (
    <BaseModal isOpen={isOpen} onRequestClose={onRequestClose}>
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
                            style={getItemStyle(snapshot.isDragging, provided.draggableProps.style)}
                          >
                            <Menu />
                            <span className={s.columnManageLabel}>{t(column.Header)}</span>
                            <div className={s.columnManageSwitch}>
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
  );
}
