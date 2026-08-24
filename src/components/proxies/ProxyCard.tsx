import cx from 'clsx';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

import { ChevronDown, Zap } from '~/components/shared/FeatherIcons';
import { DelayMapping } from '~/store/types';

import s from './ProxyCard.module.scss';

const { memo, useCallback, useLayoutEffect, useMemo, useRef, useState } = React;

// 折叠态圆点的排布节奏：圆点 12px + 间距 5px
const DOT_PITCH = 17;

export function getLatencyColor(number: number | undefined, httpsTest: boolean): string {
  if (!number || number === 0) return '#909399';
  const good = httpsTest ? 800 : 200;
  const normal = httpsTest ? 1500 : 500;
  if (number < good) return '#67c23a';
  if (number < normal) return '#d4b75c';
  return '#e67f3c';
}

function countAvailableProxies(names: string[], delay: DelayMapping): number {
  return names.filter((name) => {
    const d = delay[name];
    return d && typeof d.number === 'number' && d.number > 0;
  }).length;
}

/** 代理组 / 提供商卡片的外壳 */
export function ProxyCard({ children }: { children: React.ReactNode }) {
  return <div className={s.card}>{children}</div>;
}

/** 卡片头部：名称 + 类型徽章 + 右侧延迟 / 测速 / 折叠箭头。整行点击折叠。 */
export function ProxyCardHeader({
  name,
  type,
  isOpen,
  toggle,
  badges,
  latency,
  latencyColor,
  onTest,
  isTesting,
  extraActions,
}: {
  name: string;
  type: string;
  isOpen: boolean;
  toggle: () => void;
  badges?: React.ReactNode;
  latency?: number;
  latencyColor?: string;
  onTest?: () => void;
  isTesting?: boolean;
  extraActions?: React.ReactNode;
}) {
  const { t } = useTranslation();
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggle();
      }
    },
    [toggle],
  );

  return (
    <div
      className={s.cardHeader}
      onClick={toggle}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-expanded={isOpen}
    >
      <span className={s.name} title={name}>
        {name}
      </span>
      {type ? <span className={s.typeBadge}>{type}</span> : null}
      {badges}
      <span className={s.headerSpacer} />
      {/* oxlint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events */}
      <div className={s.headerActions} onClick={(e) => e.stopPropagation()}>
        {extraActions}
        {onTest ? (
          <button
            type="button"
            className={cx(s.iconAction, { [s.iconActionBusy]: isTesting })}
            onClick={onTest}
            title={t('Test Latency')}
            aria-label={t('Test Latency')}
            disabled={isTesting}
          >
            <Zap size={15} />
          </button>
        ) : null}
      </div>
      {typeof latency === 'number' && latency > 0 ? (
        <span className={s.headerLatency} style={{ color: latencyColor }}>
          {latency} ms
        </span>
      ) : null}
      <span className={cx(s.chevron, { [s.chevronOpen]: isOpen })} aria-hidden>
        <ChevronDown size={18} />
      </span>
    </div>
  );
}

/** 头部下方的可点击图标按钮（提供商卡片的「更新」等） */
export function ProxyCardAction({
  onClick,
  title,
  children,
  isBusy,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  isBusy?: boolean;
}) {
  return (
    <button
      type="button"
      className={cx(s.iconAction, { [s.iconActionBusy]: isBusy })}
      onClick={onClick}
      title={title}
      aria-label={title}
    >
      {children}
    </button>
  );
}

const AvailabilityBar = memo(function AvailabilityBar({
  all,
  delay,
}: {
  all: string[];
  delay: DelayMapping;
}) {
  const total = all.length;
  const available = useMemo(() => countAvailableProxies(all, delay), [all, delay]);
  const pct = total > 0 ? Math.round((available / total) * 100) : 0;

  return (
    <div className={s.availBar} title={`${available}/${total}`}>
      <div className={s.availBarTrack}>
        <div className={s.availBarFill} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
});

/**
 * 状态行：左侧当前节点，右侧节点圆点（没有当前节点时圆点靠左）。圆点插槽的宽度由 flex 决定而不是内容，
 * 所以可以直接测量它来判断一行放不放得下——放不下就退化成可用率进度条。
 */
export function ProxyCardStatusRow({
  nowName,
  nowColor,
  itemCount,
  allItems,
  delay,
  renderDots,
}: {
  nowName?: string | null;
  nowColor?: string;
  /** 参与圆点渲染的节点数（过滤后） */
  itemCount: number;
  /** 计算可用率用的完整节点列表 */
  allItems: string[];
  delay: DelayMapping;
  renderDots: () => React.ReactNode;
}) {
  const dotsSlotRef = useRef<HTMLDivElement>(null);
  const [slotWidth, setSlotWidth] = useState(0);

  useLayoutEffect(() => {
    const el = dotsSlotRef.current;
    if (!el) return;
    // sync read before first paint to avoid flash — content box, to match
    // the ResizeObserver's contentRect below (the slot has horizontal padding)
    const cs = getComputedStyle(el);
    const w = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    if (w > 0) setSlotWidth(w);
    const ro = new ResizeObserver((entries) => {
      setSlotWidth(entries[0].contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const dotsPerRow = slotWidth > 0 ? Math.floor(slotWidth / DOT_PITCH) : Infinity;
  const showBar = itemCount > dotsPerRow;

  return (
    <div className={s.statusRow}>
      {nowName ? (
        <span className={s.nowName} title={nowName}>
          <i className={s.nowDot} style={{ background: nowColor }} aria-hidden />
          {nowName}
        </span>
      ) : null}
      <div className={cx(s.dotsSlot, { [s.dotsSlotStart]: !nowName })} ref={dotsSlotRef}>
        {showBar ? <AvailabilityBar all={allItems} delay={delay} /> : renderDots()}
      </div>
    </div>
  );
}
