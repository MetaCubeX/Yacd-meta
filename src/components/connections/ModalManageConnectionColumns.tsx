import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
import React from 'react';
import { useTranslation } from 'react-i18next';

import BaseModal from '~/components/shared/BaseModal';
import { ChevronDown, ChevronUp, Menu } from '~/components/shared/FeatherIcons';
import Switch from '~/components/SwitchThemed';
import { ConnectionColumn } from '~/modules/connections/utils';

import s from './ModalManageConnectionColumns.module.scss';

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
  };

  const onShowChange = (column, val) => {
    const nextHiddenColumns = !val
      ? [...hiddenColumns, column.accessor]
      : hiddenColumns.filter((accessor) => accessor !== column.accessor);

    setHiddenColumns(nextHiddenColumns);
  };

  const moveColumn = (columnAccessor: string, direction: 'up' | 'down') => {
    const items: ConnectionColumn[] = Array.from(columns);
    const currentIndex = items.findIndex((c) => c.accessor === columnAccessor);
    if (currentIndex === -1) return;

    // 计算目标位置，跳过 id 列
    let targetIndex = currentIndex;
    if (direction === 'up') {
      // 往上移动
      targetIndex = currentIndex - 1;
      // 跳过 id 列
      while (targetIndex >= 0 && items[targetIndex].accessor === 'id') {
        targetIndex--;
      }
      if (targetIndex < 0) return;
    } else {
      // 往下移动
      targetIndex = currentIndex + 1;
      // 跳过 id 列
      while (targetIndex < items.length && items[targetIndex].accessor === 'id') {
        targetIndex++;
      }
      if (targetIndex >= items.length) return;
    }

    // 交换位置
    const [removed] = items.splice(currentIndex, 1);
    items.splice(targetIndex, 0, removed);
    setColumns(items);
  };

  // 获取非 id 列的显示列表
  const visibleColumns = columns.filter((i) => i.accessor !== 'id');

  return (
    <BaseModal isOpen={isOpen} onRequestClose={onRequestClose}>
      <div>
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="droppable-modal">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef}>
                {visibleColumns.map((column, displayIndex) => {
                  const show = !hiddenColumns.includes(column.accessor);
                  const isFirst = displayIndex === 0;
                  const isLast = displayIndex === visibleColumns.length - 1;

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
                          <Menu size={16} />
                          <span className={s.columnManageLabel}>{t(column.Header)}</span>
                          <div className={s.columnMoveButtons}>
                            <button
                              className={s.moveBtn}
                              onClick={(e) => {
                                e.stopPropagation();
                                moveColumn(column.accessor, 'up');
                              }}
                              disabled={isFirst}
                              title={t('Move Up')}
                            >
                              <ChevronUp size={14} />
                            </button>
                            <button
                              className={s.moveBtn}
                              onClick={(e) => {
                                e.stopPropagation();
                                moveColumn(column.accessor, 'down');
                              }}
                              disabled={isLast}
                              title={t('Move Down')}
                            >
                              <ChevronDown size={14} />
                            </button>
                          </div>
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
