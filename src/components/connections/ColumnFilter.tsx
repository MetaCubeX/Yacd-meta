import cx from 'clsx';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

import { Filter } from '~/components/shared/FeatherIcons';
import Input from '~/components/shared/Input';
import { Popover } from '~/components/shared/Popover';
import { ColumnFilterOption, ColumnFilters, ConnectionColumn } from '~/modules/connections/utils';

import s from './ColumnFilter.module.scss';

const { useEffect, useMemo, useRef, useState } = React;

type GetFilterOptions = (columnId: string) => ColumnFilterOption[];

type PanelProps = {
  columnId: string;
  // 传函数而不是算好的候选项：面板只在弹层打开时挂载，关着的列不用每秒重算
  getFilterOptions: GetFilterOptions;
  selected: string[];
  onChange: (values: string[]) => void;
  /** 窄屏上不自动聚焦，否则一打开就弹出软键盘，挡住列表 */
  autoFocus?: boolean;
};

function ColumnFilterPanel({
  columnId,
  getFilterOptions,
  selected,
  onChange,
  autoFocus = true,
}: PanelProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const inputRef = useRef<HTMLInputElement>(null);

  // 不能用 autoFocus 属性：Popover 首帧是 visibility: hidden（量尺寸用），那时元素不可聚焦
  useEffect(() => {
    if (!autoFocus) return;
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [autoFocus]);

  const options = getFilterOptions(columnId);
  const q = query.trim().toLowerCase();
  const visible = q
    ? options.filter((o) => (o.label ?? o.value).toLowerCase().includes(q))
    : options;

  const toggle = (value: string) =>
    onChange(selectedSet.has(value) ? selected.filter((v) => v !== value) : [...selected, value]);

  let prevSection: ColumnFilterOption['section'];

  return (
    <div className={s.panel}>
      <div className={s.toolbar}>
        <Input
          ref={inputRef}
          className={s.search}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('Search')}
          aria-label={t('Search')}
        />
        {selected.length > 0 ? (
          <button type="button" className={s.clearBtn} onClick={() => onChange([])}>
            {t('Clear')}
          </button>
        ) : null}
      </div>
      <div className={s.list}>
        {visible.length === 0 ? (
          <div className={s.empty}>{t('filter_no_values')}</div>
        ) : (
          visible.map((option) => {
            const showSection = option.section !== undefined && option.section !== prevSection;
            prevSection = option.section;
            const label = option.label ?? option.value;
            const checked = selectedSet.has(option.value);
            return (
              <React.Fragment key={option.value}>
                {showSection ? (
                  <div className={s.sectionTitle}>
                    {t(option.section === 'group' ? 'proxy_groups' : 'c_node')}
                  </div>
                ) : null}
                <label className={cx(s.option, { [s.optionChecked]: checked })}>
                  <input
                    type="checkbox"
                    className={s.checkbox}
                    checked={checked}
                    onChange={() => toggle(option.value)}
                  />
                  <span className={s.optionLabel} title={label}>
                    {label || '-'}
                  </span>
                  <span className={s.count}>{option.count}</span>
                </label>
              </React.Fragment>
            );
          })
        )}
      </div>
    </div>
  );
}

type ButtonProps = {
  column: ConnectionColumn;
  selected: string[];
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  getFilterOptions: GetFilterOptions;
  onChange: (values: string[]) => void;
};

/** 列头里的漏斗按钮和它的弹层 */
export function ColumnFilterButton({
  column,
  selected,
  isOpen,
  onToggle,
  onClose,
  getFilterOptions,
  onChange,
}: ButtonProps) {
  const { t } = useTranslation();
  const columnLabel = t(column.labelKey);
  const active = selected.length > 0;

  return (
    <Popover
      isOpen={isOpen}
      onClose={onClose}
      align="left"
      className={s.anchor}
      label={t('filter_column', { column: columnLabel })}
      trigger={
        <button
          type="button"
          className={cx(s.funnel, { [s.funnelActive]: active, [s.funnelOpen]: isOpen })}
          aria-label={t('filter_column', { column: columnLabel })}
          aria-expanded={isOpen}
          onClick={onToggle}
        >
          <Filter size={12} fill={active ? 'currentColor' : 'none'} />
        </button>
      }
    >
      <ColumnFilterPanel
        columnId={column.id}
        getFilterOptions={getFilterOptions}
        selected={selected}
        onChange={onChange}
      />
    </Popover>
  );
}

type MobileProps = {
  columns: ConnectionColumn[];
  columnFilters: ColumnFilters;
  setColumnFilter: (columnId: string, values: string[]) => void;
  getFilterOptions: GetFilterOptions;
};

/** 窄屏没有列头：工具条上一个按钮，弹层里先选列，再选取值 */
export function MobileColumnFilter({
  columns,
  columnFilters,
  setColumnFilter,
  getFilterOptions,
}: MobileProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [columnId, setColumnId] = useState<string | null>(null);

  if (columns.length === 0) return null;

  const activeCount = columns.filter((c) => (columnFilters[c.id]?.length ?? 0) > 0).length;
  const current =
    columns.find((c) => c.id === columnId) ??
    columns.find((c) => (columnFilters[c.id]?.length ?? 0) > 0) ??
    columns[0];

  return (
    <Popover
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      label={t('filter')}
      trigger={
        <button
          type="button"
          className={cx(s.mobileTrigger, { [s.funnelActive]: activeCount > 0 })}
          aria-label={t('filter')}
          aria-expanded={isOpen}
          onClick={() => setIsOpen((v) => !v)}
        >
          <Filter size={15} fill={activeCount > 0 ? 'currentColor' : 'none'} />
          {activeCount > 0 ? <span className={s.badge}>{activeCount}</span> : null}
        </button>
      }
    >
      <div className={s.columnTabs}>
        {columns.map((column) => {
          const count = columnFilters[column.id]?.length ?? 0;
          return (
            <button
              key={column.id}
              type="button"
              className={cx(s.columnTab, { [s.columnTabCurrent]: column.id === current.id })}
              aria-pressed={column.id === current.id}
              onClick={() => setColumnId(column.id)}
            >
              {t(column.labelKey)}
              {count > 0 ? <span className={s.columnTabCount}>{count}</span> : null}
            </button>
          );
        })}
      </div>
      <ColumnFilterPanel
        key={current.id}
        columnId={current.id}
        getFilterOptions={getFilterOptions}
        selected={columnFilters[current.id] ?? []}
        onChange={(values) => setColumnFilter(current.id, values)}
        autoFocus={false}
      />
    </Popover>
  );
}
