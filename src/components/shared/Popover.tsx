import cx from 'clsx';
import * as React from 'react';
import { createPortal } from 'react-dom';

import s from './Popover.module.scss';

const { useCallback, useEffect, useLayoutEffect, useRef, useState } = React;

// 弹层与视口边缘的最小间距
const VIEWPORT_MARGIN = 12;
// 弹层与触发器的间距
const ANCHOR_GAP = 8;

// 向上弹出时用 bottom 定位，面板内容变高时往上长，不会盖住触发器
type Position = ({ top: number; bottom?: undefined } | { top?: undefined; bottom: number }) & {
  left: number;
  maxWidth: number;
  maxHeight: number;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  /** 触发器，点击它不会触发「点击外部关闭」 */
  trigger: React.ReactNode;
  children: React.ReactNode;
  /** 面板与触发器的对齐边 */
  align?: 'left' | 'right';
  /** 面板在触发器的上方还是下方，贴着视口底部的触发器用 top */
  placement?: 'top' | 'bottom';
  /** 加在包住触发器的锚点元素上，触发器要撑满宽度时用 */
  className?: string;
  label?: string;
};

/**
 * 锚定弹层，点击外部或按 Esc 关闭。
 *
 * 面板通过 portal 挂到 body 上而不是留在触发器里：页面滚动容器 `.content` 是
 * `overflow-x: auto`，绝对定位的面板会被它裁掉；而顶栏的 `backdrop-filter` 又会
 * 成为 fixed 定位的包含块，所以 fixed 也救不了。挂到 body 上再按触发器的位置
 * 算坐标，顺便把面板夹在视口内，窄屏下就不会溢出到屏幕外。
 */
export function Popover({
  isOpen,
  onClose,
  trigger,
  children,
  align = 'right',
  placement = 'bottom',
  className,
  label,
}: Props) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<Position | null>(null);

  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current?.getBoundingClientRect();
    const panel = panelRef.current;
    if (!anchor || !panel) return;

    const vw = document.documentElement.clientWidth;
    const vh = document.documentElement.clientHeight;
    const maxWidth = vw - VIEWPORT_MARGIN * 2;
    const width = Math.min(panel.offsetWidth, maxWidth);

    const preferredLeft = align === 'right' ? anchor.right - width : anchor.left;
    // 夹在视口内，窄屏上触发器靠中间时也不会溢出到屏幕外
    const left = Math.min(Math.max(VIEWPORT_MARGIN, preferredLeft), vw - VIEWPORT_MARGIN - width);

    if (placement === 'top') {
      setPosition({
        bottom: vh - anchor.top + ANCHOR_GAP,
        left,
        maxWidth,
        maxHeight: Math.max(160, anchor.top - ANCHOR_GAP - VIEWPORT_MARGIN),
      });
      return;
    }

    const top = anchor.bottom + ANCHOR_GAP;
    setPosition({
      top,
      left,
      maxWidth,
      maxHeight: Math.max(160, vh - top - VIEWPORT_MARGIN),
    });
  }, [align, placement]);

  // 定位要在绘制前完成，否则会看到面板从左上角跳过来
  useLayoutEffect(() => {
    if (!isOpen) {
      setPosition(null);
      return;
    }
    updatePosition();
  }, [isOpen, updatePosition]);

  useEffect(() => {
    if (!isOpen) return;

    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (anchorRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      onClose();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', updatePosition);
    // 捕获阶段，这样内层滚动容器（.content）滚动时也能跟着动
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, onClose, updatePosition]);

  return (
    <div className={cx(s.anchor, className)} ref={anchorRef}>
      {trigger}
      {isOpen
        ? createPortal(
            <div
              ref={panelRef}
              className={cx(s.panel, {
                [s.above]: placement === 'top',
                [s.measuring]: position === null,
              })}
              role="dialog"
              aria-label={label}
              style={
                position
                  ? {
                      top: position.top,
                      bottom: position.bottom,
                      left: position.left,
                      maxWidth: position.maxWidth,
                      maxHeight: position.maxHeight,
                    }
                  : undefined
              }
            >
              {children}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
