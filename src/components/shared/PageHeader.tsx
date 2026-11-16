import cx from 'clsx';
import * as React from 'react';

import { Search } from '~/components/shared/FeatherIcons';
import { Skeleton } from '~/components/shared/Skeleton';
import { useSlidingIndicator } from '~/hooks/useSlidingIndicator';

import s from './PageHeader.module.scss';

/**
 * 页面顶栏的一套零件，代理 / 连接 / 规则 / 日志四个页面共用，
 * 样式和断点行为全在 PageHeader.module.scss 里。
 *
 * 每个零件都接 className，页面自己的模块可以往上叠特有的东西
 * （比如连接页窄屏下要重排 order）。
 */

export function PageHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <header className={cx(s.header, className)}>{children}</header>;
}

export function HeaderTitle({ children }: { children: React.ReactNode }) {
  return <h1 className={s.title}>{children}</h1>;
}

/** 窄屏下强制换行，让它后面的东西独占下一行 */
export function HeaderRowBreak({ className }: { className?: string }) {
  return <span className={cx(s.rowBreak, className)} aria-hidden />;
}

export function HeaderTabs({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  const { containerRef, indicatorRef } = useSlidingIndicator('[aria-selected="true"]');
  return (
    <div className={cx(s.tabs, className)} role="tablist" aria-label={label} ref={containerRef}>
      <div className={s.tabIndicator} ref={indicatorRef} aria-hidden="true" />
      {children}
    </div>
  );
}

/** 计数超过三位就收成 999+，否则标签宽度会跟着数字跳 */
function formatQty(n: number) {
  return n < 1000 ? String(n) : '999+';
}

export function HeaderTab({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  /** 省略则不显示计数 */
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className={cx(s.tab, { [s.tabActive]: active })}
      onClick={onClick}
    >
      {label}
      {typeof count === 'number' ? <span className={s.tabCount}>{formatQty(count)}</span> : null}
    </button>
  );
}

/**
 * 搜索框。传 value/onChange 就是受控输入，传 children 则由调用方
 * 自己塞输入组件（比如挂在 jotai atom 上的 TextFilter）。
 */
export function HeaderSearch({
  placeholder,
  value,
  onChange,
  children,
  className,
}: {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cx(s.search, className)}>
      <Search size={15} className={s.searchIcon} aria-hidden />
      {children ?? (
        <input
          type="text"
          name="filter"
          autoComplete="off"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange?.(e.target.value)}
        />
      )}
    </div>
  );
}

export function HeaderActions({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cx(s.actions, className)}>{children}</div>;
}

type ButtonVariant = 'ghost' | 'primary' | 'danger' | 'paused';

const variantClass: Record<ButtonVariant, string> = {
  ghost: s.btnGhost,
  primary: s.btnPrimary,
  danger: s.btnDanger,
  paused: s.btnPaused,
};

/**
 * HeaderButton 是顶栏的操作钮。只画图标，label 不上屏，
 * 读屏和 tooltip 全靠 aria-label 和 title 兜住。
 */
export function HeaderButton({
  variant = 'ghost',
  icon,
  label,
  /** 悬停提示，省略则用 label。展开说明按钮作用时才需要单独给 */
  title,
  busy,
  disabled,
  onClick,
}: {
  variant?: ButtonVariant;
  icon: React.ReactNode;
  label: string;
  title?: string;
  busy?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={cx(s.btn, variantClass[variant], { [s.btnBusy]: busy })}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={title ?? label}
    >
      {icon}
    </button>
  );
}

export function HeaderIconButton({
  icon,
  label,
  active,
  expanded,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  expanded?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={cx(s.iconBtn, { [s.iconBtnActive]: active })}
      onClick={onClick}
      aria-label={label}
      aria-expanded={expanded}
      title={label}
    >
      {icon}
    </button>
  );
}

/**
 * PageHeaderSkeleton 是页面数据到达前的顶栏：标题照常显示，分段标签、搜索、
 * 操作钮换成同尺寸的灰块，数据到了换成真顶栏时高度不跳。
 *
 * searchClassName / actionsClassName 传页面自己顶栏用的那两个类，
 * 窄屏下的 order 重排才和真顶栏一致。
 */
export function PageHeaderSkeleton({
  title,
  actionCount,
  searchClassName,
  actionsClassName,
}: {
  title: string;
  actionCount: number;
  searchClassName?: string;
  actionsClassName?: string;
}) {
  return (
    <PageHeader>
      <HeaderTitle>{title}</HeaderTitle>
      <Skeleton className={s.tabsSkeleton} />
      <div className={cx(s.search, searchClassName)}>
        <Skeleton className={s.searchSkeleton} />
      </div>
      {/* 空的操作区也会多占一个 gap，把搜索往左推 */}
      {actionCount > 0 ? (
        <HeaderActions className={actionsClassName}>
          {Array.from({ length: actionCount }, (_, i) => (
            <Skeleton key={i} className={s.btnSkeleton} />
          ))}
        </HeaderActions>
      ) : null}
    </PageHeader>
  );
}

/** 顶栏里的 <Select> 要叠的类名，把它拉齐到按钮那套尺寸 */
export const headerSelectClass = s.select;

/** 搜索旁边还并排放了别的控件时，叠在 HeaderSearch 上 */
export const headerSearchInlineClass = s.searchInline;
