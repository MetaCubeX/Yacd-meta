import cx from 'clsx';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { RowComponentProps, List as VirtualList } from 'react-window';

import { ArrowDown, ArrowUp, ChevronDown, Sliders, X } from '~/components/shared/FeatherIcons';
import { useMediaQuery } from '~/hooks/useMediaQuery';
import { getDateFnsLocale } from '~/misc/date-locale';
import prettyBytes from '~/misc/pretty-bytes';
import { useElementWidth } from '~/modules/connections/hooks';
import { ConnectionColumn, formatElapsed, SortState } from '~/modules/connections/utils';
import { FormattedConn } from '~/store/connections';

import ConnectionCard from './ConnectionCard';
import ConnectionDetailModal from './ConnectionDetailModal';
import s from './ConnectionTable.module.scss';

const ROW_HEIGHT = 44;
const CARD_HEIGHT = 120;
/** 纵向滚动条宽度，见 main.scss */
const SCROLLBAR_SIZE = 8;
// 列间距和行内边距由 JS 施加而非写在 scss 里：computeWidths 必须把它们算进可用
// 宽度，两处一旦不同步表格就会横向溢出
const COLUMN_GAP = 10;
const ROW_PADDING_X = 12;

/**
 * 按 grow 把剩余宽度分给流式列，返回每列实际像素宽和整行宽度。
 *
 * 分配受 max 约束：吃满上限的列退出分配、把余量让给还有余地的列，循环到分完为止。
 * 全部吃满后剩下的空间就留白，不再无限撑宽那几列。
 */
function computeWidths(columns: ConnectionColumn[], containerWidth: number) {
  const chrome = Math.max(0, columns.length - 1) * COLUMN_GAP + ROW_PADDING_X * 2;
  const widths = columns.map((c) => c.width);
  const minTotal = widths.reduce((sum, w) => sum + w, 0);
  // 列宽之外还要放下 gap 和 padding，可用于列的空间要先把它们扣掉
  const contentSpace = Math.max(0, containerWidth - SCROLLBAR_SIZE - chrome);

  let extra = contentSpace - minTotal;
  const pool = new Set(columns.map((c, i) => i).filter((i) => (columns[i].grow ?? 0) > 0));

  while (extra > 0.5 && pool.size > 0) {
    const growTotal = [...pool].reduce((sum, i) => sum + (columns[i].grow ?? 0), 0);
    const saturated: number[] = [];
    let consumed = 0;

    for (const i of pool) {
      const share = (extra * (columns[i].grow ?? 0)) / growTotal;
      const room = (columns[i].max ?? Infinity) - widths[i];
      const add = Math.min(share, room);
      widths[i] += add;
      consumed += add;
      if (add < share) saturated.push(i);
    }

    extra -= consumed;
    if (consumed <= 0.5) break;
    for (const i of saturated) pool.delete(i);
  }

  const columnsTotal = widths.reduce((sum, w) => sum + w, 0);
  // 列没占满时行仍然铺满容器，这样 hover 背景和分隔线不会只画一半
  const tableWidth = Math.max(columnsTotal + chrome, containerWidth - SCROLLBAR_SIZE);
  return { widths, tableWidth };
}

function Cell({
  column,
  conn,
  isClosed,
  fullChain,
  locale,
  onClose,
}: {
  column: ConnectionColumn;
  conn: FormattedConn;
  isClosed: boolean;
  fullChain: boolean;
  locale: ReturnType<typeof getDateFnsLocale>;
  onClose: (id: string, e: React.MouseEvent) => void;
}) {
  switch (column.kind) {
    case 'ctrl':
      return (
        <button
          type="button"
          className={s.closeBtn}
          onClick={(e) => onClose(conn.id, e)}
          title="close"
        >
          <X size={13} />
        </button>
      );

    case 'host': {
      const busy = !isClosed && (conn.downloadSpeedCurr ?? 0) + (conn.uploadSpeedCurr ?? 0) > 0;
      return (
        <>
          <span className={cx(s.dot, { [s.dotBusy]: busy, [s.dotIdle]: !busy })} aria-hidden />
          <span className={s.hostText} title={conn.host}>
            {conn.host}
          </span>
        </>
      );
    }

    case 'chip': {
      if (column.id === 'type') {
        const udp = conn.network === 'udp';
        return (
          <span className={cx(s.chip, udp ? s.chipUdp : s.chipTcp)} title={conn.type}>
            {conn.type}
          </span>
        );
      }
      const value = String((conn as any)[column.id] ?? '');
      return (
        <span className={cx(s.chip, s.chipNeutral)} title={value}>
          {value}
        </span>
      );
    }

    case 'chain': {
      if (fullChain) {
        return (
          <span className={s.chainFull} title={conn.chainsFull}>
            {conn.chainsFull}
          </span>
        );
      }
      return (
        <>
          {conn.chainGroup ? (
            <>
              <span className={s.chainGroup} title={conn.chainGroup}>
                {conn.chainGroup}
              </span>
              <span className={s.chainSep} aria-hidden>
                ›
              </span>
            </>
          ) : null}
          <span
            className={cx(s.chainNode, {
              [s.chainDirect]: conn.outboundType === 'Direct',
              [s.chainReject]: conn.outboundType === 'Reject',
            })}
            title={conn.chainNode}
          >
            {conn.chainNode}
          </span>
        </>
      );
    }

    default: {
      switch (column.id) {
        case 'start':
          return (
            <span className={s.num}>{isClosed ? '—' : formatElapsed(conn.start, locale)}</span>
          );
        case 'download':
        case 'upload':
          return <span className={s.num}>{prettyBytes((conn as any)[column.id])}</span>;
        case 'downloadSpeedCurr':
        case 'uploadSpeedCurr': {
          const speed = (conn as any)[column.id] as number;
          const dim = isClosed || speed < 1;
          return (
            <span
              className={cx(s.speed, {
                [s.speedDim]: dim,
                [s.speedDl]: !dim && column.id === 'downloadSpeedCurr',
                [s.speedUl]: !dim && column.id === 'uploadSpeedCurr',
              })}
            >
              {isClosed ? '—' : `${prettyBytes(speed)}/s`}
            </span>
          );
        }
        case 'network':
          return <span className={s.num}>{conn.network.toUpperCase()}</span>;
        default: {
          const value = String((conn as any)[column.id] ?? '');
          return (
            <span className={s.num} title={value}>
              {value}
            </span>
          );
        }
      }
    }
  }
}

type RowProps = {
  rows: FormattedConn[];
  columns: ConnectionColumn[];
  widths: number[];
  tableWidth: number;
  gridTemplate: string;
  isClosed: boolean;
  fullChain: boolean;
  locale: ReturnType<typeof getDateFnsLocale>;
  onClose: (id: string, e: React.MouseEvent) => void;
  onOpenDetails: (conn: FormattedConn) => void;
};

function DesktopRow({
  index,
  style,
  rows,
  columns,
  tableWidth,
  gridTemplate,
  isClosed,
  fullChain,
  locale,
  onClose,
  onOpenDetails,
}: RowComponentProps<RowProps>) {
  const conn = rows[index];

  return (
    <div style={{ ...style, width: tableWidth }} className={s.rowWrap}>
      <div
        className={s.row}
        style={{
          gridTemplateColumns: gridTemplate,
          columnGap: COLUMN_GAP,
          paddingLeft: ROW_PADDING_X,
          paddingRight: ROW_PADDING_X,
        }}
        onClick={() => onOpenDetails(conn)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onOpenDetails(conn);
          }
        }}
      >
        {columns.map((column) => (
          <div key={column.id} className={cx(s.cell, { [s.cellRight]: column.align === 'right' })}>
            <Cell
              column={column}
              conn={conn}
              isClosed={isClosed}
              fullChain={fullChain}
              locale={locale}
              onClose={onClose}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function MobileRow({ index, style, rows, onClose, onOpenDetails }: RowComponentProps<RowProps>) {
  const conn = rows[index];
  return (
    <div style={style}>
      <ConnectionCard conn={conn} onDisconnect={onClose} onClick={() => onOpenDetails(conn)} />
    </div>
  );
}

type Props = {
  data: FormattedConn[];
  totalCount: number;
  columns: ConnectionColumn[];
  sort: SortState;
  setSort: (key: string) => void;
  isClosed: boolean;
  fullChain: boolean;
  onCloseConn: (id: string) => void;
};

export default function ConnectionTable({
  data,
  totalCount,
  columns,
  sort,
  setSort,
  isClosed,
  fullChain,
  onCloseConn,
}: Props) {
  const { t, i18n } = useTranslation();
  // 只存 id，每次渲染从实时 data 里取最新对象，弹窗里的流量/时长才能实时更新
  const [detailId, setDetailId] = React.useState<string | null>(null);
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [containerRef, containerWidth] = useElementWidth<HTMLDivElement>();
  const headRef = React.useRef<HTMLDivElement>(null);

  const locale = getDateFnsLocale(i18n.language);

  const { widths, tableWidth } = React.useMemo(
    () => computeWidths(columns, containerWidth),
    [columns, containerWidth],
  );
  const gridTemplate = React.useMemo(() => widths.map((w) => `${w}px`).join(' '), [widths]);

  const handleClose = React.useCallback(
    (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      onCloseConn(id);
    },
    [onCloseConn],
  );

  const handleOpenDetails = React.useCallback((conn: FormattedConn) => {
    setDetailId(conn.id);
  }, []);

  const handleCloseDetails = React.useCallback(() => {
    setDetailId(null);
  }, []);

  // 详情里的连接被关闭/移出列表（如切换标签、筛选变化）时自动关闭弹窗
  const detailConn = detailId ? (data.find((c) => c.id === detailId) ?? null) : null;
  React.useEffect(() => {
    if (detailId && !detailConn) setDetailId(null);
  }, [detailId, detailConn]);

  // Esc 关闭详情
  React.useEffect(() => {
    if (!detailConn) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDetailId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [detailConn]);

  const rowProps = React.useMemo<RowProps>(
    () => ({
      rows: data,
      columns,
      widths,
      tableWidth,
      gridTemplate,
      isClosed,
      fullChain,
      locale,
      onClose: handleClose,
      onOpenDetails: handleOpenDetails,
    }),
    [
      data,
      columns,
      widths,
      tableWidth,
      gridTemplate,
      isClosed,
      fullChain,
      locale,
      handleClose,
      handleOpenDetails,
    ],
  );

  const rowHeight = React.useCallback(() => {
    return isMobile ? CARD_HEIGHT : ROW_HEIGHT;
  }, [isMobile]);

  const rowKey = React.useCallback((index: number, props: RowProps) => props.rows[index].id, []);

  const syncHeadScroll = React.useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (headRef.current) headRef.current.scrollLeft = e.currentTarget.scrollLeft;
  }, []);

  const sortableColumns = React.useMemo(
    () => columns.filter((c) => c.sortable !== false),
    [columns],
  );
  const sortLabel = sortableColumns.find((c) => c.id === sort.key)?.labelKey;

  const empty = data.length === 0;

  return (
    <div className={s.card}>
      <div className={s.body} ref={containerRef}>
        {isMobile ? (
          <div className={s.mobileToolbar}>
            <div className={s.sortSelect}>
              <Sliders size={14} />
              <span>
                {t('Sort')}: {sortLabel ? t(sortLabel) : ''}
              </span>
              <select value={sort.key} onChange={(e) => setSort(e.target.value)}>
                {sortableColumns.map((column) => (
                  <option key={column.id} value={column.id}>
                    {t(column.labelKey)}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className={s.sortSelectArrow} />
            </div>
            <button
              type="button"
              className={s.sortDirBtn}
              onClick={() => setSort(sort.key)}
              aria-label={t(sort.dir === 'desc' ? 'sort_desc' : 'sort_asc')}
            >
              {sort.dir === 'desc' ? <ArrowDown size={16} /> : <ArrowUp size={16} />}
            </button>
          </div>
        ) : (
          <div className={s.headWrap} ref={headRef}>
            <div
              className={s.headRow}
              style={{
                width: tableWidth,
                gridTemplateColumns: gridTemplate,
                columnGap: COLUMN_GAP,
                paddingLeft: ROW_PADDING_X,
                paddingRight: ROW_PADDING_X,
              }}
              role="row"
            >
              {columns.map((column) => {
                const sortable = column.sortable !== false;
                const active = sortable && sort.key === column.id;
                return (
                  <div
                    key={column.id}
                    className={cx(s.headCell, {
                      [s.cellRight]: column.align === 'right',
                      [s.headCellSortable]: sortable,
                      [s.headCellActive]: active,
                    })}
                    onClick={sortable ? () => setSort(column.id) : undefined}
                    onKeyDown={
                      sortable
                        ? (e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setSort(column.id);
                            }
                          }
                        : undefined
                    }
                    role={sortable ? 'button' : undefined}
                    tabIndex={sortable ? 0 : undefined}
                  >
                    <span className={s.headText}>
                      {column.kind === 'ctrl' ? '' : t(column.labelKey)}
                    </span>
                    {active ? (
                      <span className={s.headArrow}>{sort.dir === 'desc' ? '↓' : '↑'}</span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className={s.listWrap}>
          {empty ? (
            <div className={s.empty}>
              <span className={s.emptyTitle}>{t('conn_empty_title')}</span>
              <span className={s.emptyHint}>{t('conn_empty_hint')}</span>
            </div>
          ) : (
            <VirtualList
              className={isMobile ? s.mobileList : s.list}
              style={{ height: '100%', width: '100%' }}
              onScroll={isMobile ? undefined : syncHeadScroll}
              rowCount={data.length}
              rowHeight={rowHeight}
              rowComponent={isMobile ? MobileRow : DesktopRow}
              rowKey={rowKey}
              rowProps={rowProps}
            />
          )}
        </div>
      </div>

      {detailConn ? (
        <ConnectionDetailModal conn={detailConn} onRequestClose={handleCloseDetails} />
      ) : null}

      <div className={s.footer}>
        <span>{t('conn_shown', { shown: data.length, total: totalCount })}</span>
        {sortLabel ? (
          <span>
            {t('conn_sorted_by', {
              column: t(sortLabel),
              dir: t(sort.dir === 'desc' ? 'sort_desc' : 'sort_asc'),
            })}
          </span>
        ) : null}
        {isClosed ? <span className={s.footerNote}>{t('conn_note_closed')}</span> : null}
      </div>
    </div>
  );
}
