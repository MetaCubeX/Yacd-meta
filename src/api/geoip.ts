/**
 * High-level wrapper around the four offline IP databases.
 *
 * Lifecycle:
 *   1. `init()` is called once at app startup. It fetches the four DB
 *      files in parallel from /geoip/* and parses them.
 *   2. After init resolves, `lookupIp(ip)` is synchronous and fast
 *      (microseconds). It checks the LRU cache, then falls through to
 *      the right DB based on IP version.
 *   3. If `lookupIp` is called before `init()` resolves, it returns
 *      '' (the cell will render an em-dash).
 *
 * DBs loaded:
 *   - ip2region_v4.xdb  -> primary for IPv4
 *   - qqwry.dat         -> fallback for IPv4 (better China coverage)
 *   - zxipv6wry.db      -> primary for IPv6
 *   - cdn.yml           -> used by `lookupCdn(host)` for host columns
 */

import { createSearcher as createIp2Region } from '~/lib/geoip/xdb';
import { createQQwrySearcher } from '~/lib/geoip/qqwry';
import { createZxIpv6Searcher } from '~/lib/geoip/zxipv6';
import { createCdnSearcher, CdnEntry } from '~/lib/geoip/cdn';

interface Searchers {
  ip2: ReturnType<typeof createIp2Region>;
  qqr: ReturnType<typeof createQQwrySearcher>;
  zx: ReturnType<typeof createZxIpv6Searcher>;
  cdn: ReturnType<typeof createCdnSearcher>;
}

let state: {
  ready: boolean;
  loading: Promise<void> | null;
  cache: Map<string, string>;
  searchers: Searchers | null;
  cacheMax: number;
} = {
  ready: false,
  loading: null,
  cache: new Map(),
  searchers: null,
  cacheMax: 5000,
};

function isIpv4(s: string): boolean {
  return /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(s);
}
function isIpv6(s: string): boolean {
  return s.includes(':');
}

async function fetchBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const buf = await res.arrayBuffer();
  return new Uint8Array(buf);
}

async function loadAll(): Promise<void> {
  const [ip2Buf, qqrBuf, zxBuf, cdnText] = await Promise.all([
    fetchBytes('/geoip/ip2region_v4.xdb'),
    fetchBytes('/geoip/qqwry.dat'),
    fetchBytes('/geoip/zxipv6wry.db'),
    fetch('/geoip/cdn.yml').then((r) => (r.ok ? r.text() : '')),
  ]);
  state.searchers = {
    ip2: createIp2Region(ip2Buf),
    qqr: createQQwrySearcher(qqrBuf),
    zx: createZxIpv6Searcher(zxBuf),
    cdn: createCdnSearcher(cdnText),
  };
  state.ready = true;
}

export function init(): Promise<void> {
  if (state.ready) return Promise.resolve();
  if (!state.loading) {
    state.loading = loadAll().catch((err) => {
      // Reset so the next call to init() can retry.
      state.loading = null;
      throw err;
    });
  }
  return state.loading;
}

export function isReady(): boolean {
  return state.ready;
}

/** Synchronous IP lookup. Returns '' if the DBs aren't ready yet. */
export function lookupIp(ip: string): string {
  if (!state.ready || !state.searchers) return '';
  if (!ip) return '';
  const cached = state.cache.get(ip);
  if (cached !== undefined) return cached;

  let result = '';
  if (isIpv4(ip)) {
    // Try ip2region first (cleaner), fall back to qqwry (better China data).
    result = state.searchers.ip2.search(ip) || state.searchers.qqr.search(ip);
  } else if (isIpv6(ip)) {
    result = state.searchers.zx.search(ip);
  }
  if (result) {
    if (state.cache.size >= state.cacheMax) {
      // Drop the oldest entry (Maps iterate in insertion order).
      const first = state.cache.keys().next().value;
      if (first !== undefined) state.cache.delete(first);
    }
    state.cache.set(ip, result);
  }
  return result;
}

/** Synchronous CDN provider lookup. Returns null if not ready or unknown. */
export function lookupCdn(host: string): CdnEntry | null {
  if (!state.ready || !state.searchers) return null;
  if (!host) return null;
  return state.searchers.cdn.lookup(host);
}
