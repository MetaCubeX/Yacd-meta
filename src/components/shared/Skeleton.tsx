import cx from 'clsx';
import type * as React from 'react';

import s from './Skeleton.module.scss';

type Props = {
  width?: React.CSSProperties['width'];
  height?: React.CSSProperties['height'];
  radius?: React.CSSProperties['borderRadius'];
  /** 尺寸要跟断点变化时，改用 className 在样式表里给宽高 */
  className?: string;
};

/**
 * Skeleton 是数据到达前的占位灰块。它对读屏隐藏，所以包住一整块骨架的容器
 * 应当自己带 aria-busy。
 */
export function Skeleton({ width, height, radius, className }: Props) {
  return (
    <span
      className={cx(s.skeleton, className)}
      style={{ width, height, borderRadius: radius }}
      aria-hidden
    />
  );
}

/** 一段文字高度的占位，height 默认跟随当前字号 */
export function SkeletonText({ width, className }: { width?: Props['width']; className?: string }) {
  return <Skeleton width={width} className={cx(s.text, className)} />;
}
