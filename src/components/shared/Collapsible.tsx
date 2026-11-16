import { AnimatePresence, domAnimation, LazyMotion, m } from 'framer-motion';
import React from 'react';

const { memo } = React;

/**
 * Collapsible 只在展开时渲染 children，收起动画播完后卸载。
 *
 * 收起时若只把高度压成 0，不可见的子树照样参与布局和文字整形：代理页几十张卡片
 * 全收起时 DOM 仍有四千多个节点，每次切标签页都要多花上百毫秒。
 */
const Collapsible = memo(({ children, isOpen }: { children: React.ReactNode; isOpen: boolean }) => {
  return (
    <LazyMotion features={domAnimation}>
      {/* initial={false}：首次渲染时已展开的内容直接出现，不播展开动画 */}
      <AnimatePresence initial={false}>
        {isOpen ? (
          <m.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{ overflow: 'hidden' }}
          >
            {children}
          </m.div>
        ) : null}
      </AnimatePresence>
    </LazyMotion>
  );
});

export default Collapsible;
