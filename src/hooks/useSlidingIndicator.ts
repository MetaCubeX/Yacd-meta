import * as React from 'react';

/**
 * useSlidingIndicator keeps one indicator element sized and positioned over the item in the
 * container that matches activeSelector, so the selected background can slide between items.
 * A per-item background cannot do this: it only fades in place, and a gradient does not
 * transition at all.
 *
 * Attach containerRef to a positioned element (it is the indicator's offsetParent) and
 * indicatorRef to an absolutely positioned child styled with the `sliding-indicator` mixin.
 * The position is written straight to the DOM on every render of the caller, so the caller
 * does not need to know which item is active. Only changes made during a render animate; the
 * first placement and container resizes jump into place.
 */
export function useSlidingIndicator(activeSelector: string) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const indicatorRef = React.useRef<HTMLDivElement>(null);
  const placedRef = React.useRef(false);

  const place = React.useCallback(
    (animate: boolean) => {
      const container = containerRef.current;
      const indicator = indicatorRef.current;
      if (!container || !indicator) return;
      const active = container.querySelector<HTMLElement>(activeSelector);
      if (!active) {
        indicator.style.opacity = '0';
        placedRef.current = false;
        return;
      }
      // offsetLeft/offsetWidth round to whole pixels and leave the indicator up to 1px off
      // items with fractional widths, so measure with rects. The indicator's origin is the
      // container's padding box, hence the clientLeft/clientTop (border width) correction.
      const box = container.getBoundingClientRect();
      const rect = active.getBoundingClientRect();
      // Rects include ancestor transforms and offsets do not. Inside a dialog that scales in,
      // the first placement happens mid-animation and no resize follows to correct it, so
      // convert the rects back to layout pixels.
      const scaleX = container.offsetWidth ? box.width / container.offsetWidth : 1;
      const scaleY = container.offsetHeight ? box.height / container.offsetHeight : 1;
      const x = (rect.left - box.left) / scaleX - container.clientLeft;
      const y = (rect.top - box.top) / scaleY - container.clientTop;
      indicator.dataset.animate = String(animate && placedRef.current);
      indicator.style.opacity = '1';
      indicator.style.width = `${rect.width / scaleX}px`;
      indicator.style.height = `${rect.height / scaleY}px`;
      indicator.style.transform = `translate(${x}px, ${y}px)`;
      placedRef.current = true;
    },
    [activeSelector],
  );

  // Runs after every render on purpose: the caller's children decide which item is active.
  React.useLayoutEffect(() => {
    place(true);
  });

  // Items are observed too: a tab can change width (e.g. its count arrives) without the
  // container resizing, when something else in the row absorbs the difference.
  React.useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(() => place(false));
    ro.observe(container);
    // Skip the indicator: its animated width would re-place it with animate=false every frame.
    for (const child of container.children) {
      if (child !== indicatorRef.current) ro.observe(child);
    }
    return () => ro.disconnect();
  }, [place]);

  return { containerRef, indicatorRef };
}
