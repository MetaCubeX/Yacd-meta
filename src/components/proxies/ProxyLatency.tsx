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
  const textRef = React.useRef<HTMLSpanElement>(null);
  const prevNumberRef = React.useRef(number);

  // Animate by mutating the text node directly instead of setState: during a
  // bulk latency test hundreds of these run concurrently, and going through
  // React would mean hundreds of state updates per frame. React renders the
  // final label; the rAF loop only writes intermediate values on top of it.
  React.useEffect(() => {
    const from = prevNumberRef.current;
    prevNumberRef.current = number;

    // no previous value (first load), unchanged, or currently showing
    // "Testing..." — snap, don't animate
    if (!hasNumber || isTesting || typeof from !== 'number' || from === number) return;

    const to = number as number;
    const startTime = performance.now();
    let rafId: number;

    const tick = (now: number) => {
      const progress = Math.min((now - startTime) / ANIMATION_DURATION_MS, 1);
      const eased = 1 - (1 - progress) * (1 - progress);
      if (textRef.current) {
        textRef.current.textContent = `${Math.round(from + (to - from) * eased)} ms`;
      }
      if (progress < 1) {
        rafId = requestAnimationFrame(tick);
      }
    };
    rafId = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(rafId);
  }, [number, hasNumber, isTesting]);

  const label = isTesting ? 'Testing...' : hasNumber ? `${number} ms` : error || '--';

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
      <span ref={textRef}>{label}</span>
    </span>
  );
}
