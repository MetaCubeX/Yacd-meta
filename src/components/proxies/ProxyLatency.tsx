import cx from 'clsx';
import * as React from 'react';

import s0 from './ProxyLatency.module.scss';

type ProxyLatencyProps = {
  number?: number;
  color: string;
  isTesting?: boolean;
  error?: string;
  onClick?: () => void;
};

const ANIMATION_DURATION_MS = 450;

export function ProxyLatency({ number, color, isTesting, error, onClick }: ProxyLatencyProps) {
  const hasNumber = typeof number === 'number';
  const [displayNumber, setDisplayNumber] = React.useState(number);
  const prevNumberRef = React.useRef(number);
  const rafRef = React.useRef<number>();

  React.useEffect(() => {
    if (!hasNumber) {
      prevNumberRef.current = number;
      setDisplayNumber(number);
      return;
    }

    const from = prevNumberRef.current;
    const to = number as number;
    prevNumberRef.current = number;

    // no previous value (first load) or unchanged — snap, don't animate
    if (typeof from !== 'number' || from === to) {
      setDisplayNumber(to);
      return;
    }

    const startTime = performance.now();

    const tick = (now: number) => {
      const progress = Math.min((now - startTime) / ANIMATION_DURATION_MS, 1);
      const eased = 1 - (1 - progress) * (1 - progress);
      setDisplayNumber(Math.round(from + (to - from) * eased));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [number, hasNumber]);

  const label = isTesting ? 'Testing...' : hasNumber ? `${displayNumber} ms` : error || '--';

  const className = cx(s0.proxyLatency, {
    [s0.clickable]: Boolean(onClick),
    [s0.placeholder]: !hasNumber || Boolean(error),
    [s0.testing]: isTesting,
  });

  const handleClick = React.useCallback(
    (e: React.MouseEvent) => {
      if (!onClick || isTesting) return;
      e.preventDefault();
      e.stopPropagation();
      onClick();
    },
    [isTesting, onClick]
  );

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (!onClick || isTesting) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }
    },
    [isTesting, onClick]
  );

  return (
    <span
      className={className}
      style={{ color: hasNumber ? color : undefined }}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      title={label}
    >
      <span>{label}</span>
    </span>
  );
}
