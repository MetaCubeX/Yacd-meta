import { atom, getDefaultStore } from 'jotai';

import type { DelayMapping } from './types';

/** 代理页搜索词。过滤在 modules/proxies/hooks 里做 */
export const proxyFilterText = atom('');

/**
 * 本地测速结果。服务端那份延迟数据在 /proxies 的 history 里，这里只放前端发起的
 * 测速产生的东西：进行中的 testing 标志、失败原因、以及后端数据回来之前的临时值。
 * 合并规则见 modules/proxies/utils 的 mergeDelayMapping
 */
export const delayPatchesAtom = atom<DelayMapping>({});

// 用默认 store，这样批量刷新的定时器不必挂在某个组件上
const store = getDefaultStore();

// 批量测速时每个节点的结果各自回来，逐条写 atom 会在一瞬间触发 N 次渲染。
// 攒够一个窗口再合并写入。
const FLUSH_INTERVAL_MS = 100;
const pending = new Map<string, DelayMapping[string]>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;

export function setDelayPatch(
  name: string,
  patch: { number?: number; error?: string; testing?: boolean },
) {
  // updatedAt 记的是测速时刻而不是刷新时刻，晚 100ms 写进去会盖掉这期间回来的后端数据
  pending.set(name, { ...pending.get(name), ...patch, updatedAt: Date.now() });
  if (flushTimer !== null) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    const patches = new Map(pending);
    pending.clear();
    store.set(delayPatchesAtom, (prev) => {
      const next = { ...prev };
      for (const [proxyName, p] of patches) {
        next[proxyName] = { ...next[proxyName], ...p };
      }
      return next;
    });
  }, FLUSH_INTERVAL_MS);
}
