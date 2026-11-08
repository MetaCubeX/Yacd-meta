import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MeasuringStrategy,
  PointerSensor,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  type SortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import cx from 'clsx';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

import { Menu, Plus, X } from '~/components/shared/FeatherIcons';
import {
  CONNECTION_COLUMN_MAP,
  CONNECTION_COLUMNS,
  ConnectionColumn,
} from '~/modules/connections/utils';

import s from './ColumnsEditor.module.scss';

const ENABLED = 'list:enabled';
const AVAILABLE = 'list:available';
type ListId = typeof ENABLED | typeof AVAILABLE;

const isList = (id: UniqueIdentifier): id is ListId => id === ENABLED || id === AVAILABLE;

// The available list always follows CONNECTION_COLUMNS order, so its items never move aside
// for the dragged one: whatever is dropped there lands in its fixed place.
const keepInPlace: SortingStrategy = () => null;

type Props = {
  enabledIds: string[];
  setColumns: (ids: string[]) => void;
  addColumn: (id: string) => void;
  removeColumn: (id: string) => void;
  onDraggingChange: (dragging: boolean) => void;
};

/**
 * ColumnsEditor shows the enabled columns (sortable) next to the available ones. Dragging
 * within the enabled list reorders it; dragging between the lists enables or disables a column.
 */
export function ColumnsEditor({
  enabledIds: savedIds,
  setColumns,
  addColumn,
  removeColumn,
  onDraggingChange,
}: Props) {
  const { t } = useTranslation();
  // Moves between lists go into this draft while the drag runs and are saved on drop, so
  // Escape can throw them away.
  const [draft, setDraft] = React.useState<string[] | null>(null);
  const [activeId, setActiveId] = React.useState<string | null>(null);

  const enabledIds = draft ?? savedIds;
  const availableIds = React.useMemo(
    () => CONNECTION_COLUMNS.filter((c) => !enabledIds.includes(c.id)).map((c) => c.id),
    [enabledIds],
  );

  const listOf = (id: UniqueIdentifier): ListId | null => {
    if (isList(id)) return id;
    if (enabledIds.includes(String(id))) return ENABLED;
    if (availableIds.includes(String(id))) return AVAILABLE;
    return null;
  };

  const sensors = useSensors(
    // The whole row starts a pointer drag, so a few pixels of travel are required before it
    // does; otherwise the add/remove button inside it could never be clicked.
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Prefer the row under the pointer. In the gaps between rows the pointer is only over the
  // list, and "over the list" would mean "append to the end"; resolve it to the nearest row of
  // that list instead so crossing a gap does not make the placeholder jump to the bottom.
  // Keyboard drags have no pointer and use plain closestCenter.
  const collisionDetection: CollisionDetection = (args) => {
    if (!args.pointerCoordinates) return closestCenter(args);
    const hits = pointerWithin(args);
    const row = hits.find((hit) => !isList(hit.id));
    if (row) return [row];
    const list = hits.find((hit) => isList(hit.id));
    if (!list) return [];
    const ids = list.id === ENABLED ? enabledIds : availableIds;
    const rows = args.droppableContainers.filter((c) => ids.includes(String(c.id)));
    return rows.length > 0 ? closestCenter({ ...args, droppableContainers: rows }) : [list];
  };

  const finish = () => {
    setDraft(null);
    setActiveId(null);
    onDraggingChange(false);
  };

  const handleDragStart = ({ active }: DragStartEvent) => {
    setDraft(savedIds);
    setActiveId(String(active.id));
    onDraggingChange(true);
  };

  // Only moves between lists happen here. Moves within the enabled list are left to the
  // sortable strategy's transforms and applied once, on drop.
  const handleDragOver = ({ active, over }: DragOverEvent) => {
    if (!over) return;
    const from = listOf(active.id);
    const to = listOf(over.id);
    if (!from || !to || from === to) return;
    const id = String(active.id);
    setDraft((prev) => {
      const current = prev ?? savedIds;
      if (to === AVAILABLE) return current.filter((each) => each !== id);
      if (current.includes(id)) return current;
      const overIndex = current.indexOf(String(over.id));
      if (overIndex < 0) return [...current, id];
      const dragged = active.rect.current.translated;
      const below =
        dragged != null && dragged.top + dragged.height / 2 > over.rect.top + over.rect.height / 2;
      const index = overIndex + (below ? 1 : 0);
      return [...current.slice(0, index), id, ...current.slice(index)];
    });
  };

  // A drop outside both lists still keeps what the lists show at that moment.
  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    let next = draft ?? savedIds;
    const id = String(active.id);
    const from = next.indexOf(id);
    const to = over ? next.indexOf(String(over.id)) : -1;
    if (from >= 0 && to >= 0 && from !== to) next = arrayMove(next, from, to);
    finish();
    if (next.join() !== savedIds.join()) setColumns(next);
  };

  const activeColumn = activeId ? CONNECTION_COLUMN_MAP[activeId] : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      // Rows change lists mid-drag, so list and row rects must be re-measured as they move.
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={finish}
    >
      <div className={s.grid}>
        <ColumnList
          id={ENABLED}
          title={t('columns_enabled')}
          ids={enabledIds}
          strategy={verticalListSortingStrategy}
          emptyText={t('columns_drop_here')}
        >
          {enabledIds.map((id) => (
            <SortableRow
              key={id}
              column={CONNECTION_COLUMN_MAP[id]}
              action="remove"
              onAction={() => removeColumn(id)}
            />
          ))}
        </ColumnList>
        <ColumnList
          id={AVAILABLE}
          title={t('columns_available')}
          ids={availableIds}
          strategy={keepInPlace}
          emptyText={t('columns_all_enabled')}
        >
          {availableIds.map((id) => (
            <SortableRow
              key={id}
              column={CONNECTION_COLUMN_MAP[id]}
              action="add"
              onAction={() => addColumn(id)}
            />
          ))}
        </ColumnList>
      </div>
      <DragOverlay>
        {activeColumn ? (
          <Row
            column={activeColumn}
            action={listOf(activeColumn.id) === ENABLED ? 'remove' : 'add'}
            isOverlay
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function ColumnList({
  id,
  title,
  ids,
  strategy,
  emptyText,
  children,
}: {
  id: ListId;
  title: string;
  ids: string[];
  strategy: SortingStrategy;
  emptyText: string;
  children: React.ReactNode;
}) {
  const { setNodeRef } = useDroppable({ id });
  return (
    <section className={s.list} aria-label={title}>
      <div className={s.listHead}>
        <span>{title}</span>
        <span className={s.count}>{ids.length}</span>
      </div>
      <SortableContext id={id} items={ids} strategy={strategy}>
        <div
          ref={setNodeRef}
          className={cx(s.listBody, id === ENABLED ? s.listBodyEnabled : s.listBodyAvailable)}
        >
          {children}
          {ids.length === 0 ? <span className={s.empty}>{emptyText}</span> : null}
        </div>
      </SortableContext>
    </section>
  );
}

type Action = 'add' | 'remove';

function SortableRow({
  column,
  action,
  onAction,
}: {
  column: ConnectionColumn;
  action: Action;
  onAction: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id });
  return (
    <Row
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      column={column}
      action={action}
      onAction={onAction}
      isPlaceholder={isDragging}
      // Pointer drags start anywhere on the row. Keyboard drags start only from the handle,
      // which carries the focus and ARIA attributes; with the key listener on the row,
      // Space/Enter on the add/remove button would pick the row up instead of clicking.
      // dnd-kit types its listener map as Record<string, Function>.
      onPointerDown={listeners?.onPointerDown as React.PointerEventHandler | undefined}
      handleRef={setActivatorNodeRef}
      handleProps={{ ...attributes, ...listeners }}
    />
  );
}

function Row({
  ref,
  style,
  column,
  action,
  onAction,
  isPlaceholder,
  isOverlay,
  onPointerDown,
  handleRef,
  handleProps,
}: {
  ref?: React.Ref<HTMLDivElement>;
  style?: React.CSSProperties;
  column: ConnectionColumn;
  action: Action;
  onAction?: () => void;
  isPlaceholder?: boolean;
  isOverlay?: boolean;
  onPointerDown?: React.PointerEventHandler;
  handleRef?: React.Ref<HTMLSpanElement>;
  handleProps?: React.HTMLAttributes<HTMLSpanElement>;
}) {
  const { t } = useTranslation();
  return (
    <div
      ref={ref}
      style={style}
      onPointerDown={onPointerDown}
      className={cx(s.row, action === 'remove' ? s.rowEnabled : s.rowAvailable, {
        [s.rowPlaceholder]: isPlaceholder,
        [s.rowOverlay]: isOverlay,
      })}
    >
      <span ref={handleRef} {...handleProps} className={s.handle} title={t('drag_to_reorder')}>
        <Menu size={13} />
      </span>
      <span className={s.label}>{t(column.labelKey)}</span>
      <button
        type="button"
        className={s.action}
        onClick={onAction}
        title={action === 'add' ? t('add_column') : t('remove')}
        tabIndex={isOverlay ? -1 : undefined}
      >
        {action === 'add' ? <Plus size={14} /> : <X size={13} />}
      </button>
    </div>
  );
}
