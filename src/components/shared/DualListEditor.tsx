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
  rectSortingStrategy,
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

import s from './DualListEditor.module.scss';

const ENABLED = 'list:enabled';
const AVAILABLE = 'list:available';
type ListId = typeof ENABLED | typeof AVAILABLE;

const isList = (id: UniqueIdentifier): id is ListId => id === ENABLED || id === AVAILABLE;

// The available list keeps the caller's fixed order, so its items never move aside for the
// dragged one: whatever is dropped there lands in its fixed place.
const keepInPlace: SortingStrategy = () => null;

export type DualListItemContext = { enabled: boolean; isOverlay: boolean };

type Props = {
  enabledIds: string[];
  /**
   * The available items for a given enabled list, in their fixed order. It is called with the
   * draft list while a drag is running, so it must derive from its argument only.
   */
  getAvailableIds: (enabledIds: string[]) => string[];
  /** Called on drop with the new enabled list, only when it changed. */
  onChange: (ids: string[]) => void;
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
  renderItem: (id: string, ctx: DualListItemContext) => React.ReactNode;
  enabledTitle: string;
  availableTitle: string;
  enabledEmptyText: string;
  availableEmptyText: string;
  addLabel: string;
  /** columns: two vertical lists side by side. wrap: two stacked lists of chips that wrap. */
  layout?: 'columns' | 'wrap';
  onDraggingChange?: (dragging: boolean) => void;
};

/**
 * DualListEditor shows the enabled items (sortable) next to the available ones. Dragging
 * within the enabled list reorders it; dragging between the lists enables or disables an item.
 */
export function DualListEditor({
  enabledIds: savedIds,
  getAvailableIds,
  onChange,
  onAdd,
  onRemove,
  renderItem,
  enabledTitle,
  availableTitle,
  enabledEmptyText,
  availableEmptyText,
  addLabel,
  layout = 'columns',
  onDraggingChange,
}: Props) {
  // Moves between lists go into this draft while the drag runs and are saved on drop, so
  // Escape can throw them away.
  const [draft, setDraft] = React.useState<string[] | null>(null);
  const [activeId, setActiveId] = React.useState<string | null>(null);

  const enabledIds = draft ?? savedIds;
  const availableIds = React.useMemo(
    () => getAvailableIds(enabledIds),
    [getAvailableIds, enabledIds],
  );
  const isWrap = layout === 'wrap';

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
  // that list instead so crossing a gap does not make the placeholder jump to the end.
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
    onDraggingChange?.(false);
  };

  const handleDragStart = ({ active }: DragStartEvent) => {
    setDraft(savedIds);
    setActiveId(String(active.id));
    onDraggingChange?.(true);
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
      // Insert on the side of the hovered item the dragged one's centre is on: left/right for
      // chips in a row, above/below for a vertical list.
      const dragged = active.rect.current.translated;
      const after =
        dragged != null &&
        (isWrap
          ? dragged.left + dragged.width / 2 > over.rect.left + over.rect.width / 2
          : dragged.top + dragged.height / 2 > over.rect.top + over.rect.height / 2);
      const index = overIndex + (after ? 1 : 0);
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
    if (next.join() !== savedIds.join()) onChange(next);
  };

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
      <div className={isWrap ? s.stack : s.grid}>
        <ItemList
          id={ENABLED}
          title={enabledTitle}
          ids={enabledIds}
          strategy={isWrap ? rectSortingStrategy : verticalListSortingStrategy}
          emptyText={enabledEmptyText}
          isWrap={isWrap}
        >
          {enabledIds.map((id) => (
            <SortableRow
              key={id}
              id={id}
              enabled
              label={renderItem(id, { enabled: true, isOverlay: false })}
              actionLabel={addLabel}
              onAction={() => onRemove(id)}
            />
          ))}
        </ItemList>
        <ItemList
          id={AVAILABLE}
          title={availableTitle}
          ids={availableIds}
          strategy={keepInPlace}
          emptyText={availableEmptyText}
          isWrap={isWrap}
        >
          {availableIds.map((id) => (
            <SortableRow
              key={id}
              id={id}
              enabled={false}
              label={renderItem(id, { enabled: false, isOverlay: false })}
              actionLabel={addLabel}
              onAction={() => onAdd(id)}
            />
          ))}
        </ItemList>
      </div>
      <DragOverlay>
        {activeId ? (
          <Row
            enabled={listOf(activeId) === ENABLED}
            label={renderItem(activeId, {
              enabled: listOf(activeId) === ENABLED,
              isOverlay: true,
            })}
            actionLabel={addLabel}
            isOverlay
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function ItemList({
  id,
  title,
  ids,
  strategy,
  emptyText,
  isWrap,
  children,
}: {
  id: ListId;
  title: string;
  ids: string[];
  strategy: SortingStrategy;
  emptyText: string;
  isWrap: boolean;
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
          className={cx(s.listBody, {
            [s.listBodyEnabled]: id === ENABLED,
            [s.listBodyAvailable]: id === AVAILABLE,
            [s.listBodyWrap]: isWrap,
          })}
        >
          {children}
          {ids.length === 0 ? <span className={s.empty}>{emptyText}</span> : null}
        </div>
      </SortableContext>
    </section>
  );
}

function SortableRow({
  id,
  enabled,
  label,
  actionLabel,
  onAction,
}: {
  id: string;
  enabled: boolean;
  label: React.ReactNode;
  actionLabel: string;
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
  } = useSortable({ id });
  return (
    <Row
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      enabled={enabled}
      label={label}
      actionLabel={actionLabel}
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
  enabled,
  label,
  actionLabel,
  onAction,
  isPlaceholder,
  isOverlay,
  onPointerDown,
  handleRef,
  handleProps,
}: {
  ref?: React.Ref<HTMLDivElement>;
  style?: React.CSSProperties;
  enabled: boolean;
  label: React.ReactNode;
  actionLabel: string;
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
      className={cx(s.row, enabled ? s.rowEnabled : s.rowAvailable, {
        [s.rowPlaceholder]: isPlaceholder,
        [s.rowOverlay]: isOverlay,
      })}
    >
      <span ref={handleRef} {...handleProps} className={s.handle} title={t('drag_to_reorder')}>
        <Menu size={13} />
      </span>
      <span className={s.label}>{label}</span>
      <button
        type="button"
        className={s.action}
        onClick={onAction}
        title={enabled ? t('remove') : actionLabel}
        tabIndex={isOverlay ? -1 : undefined}
      >
        {enabled ? <X size={13} /> : <Plus size={14} />}
      </button>
    </div>
  );
}
