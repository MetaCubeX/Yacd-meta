import { formatDistance, Locale } from 'date-fns';

import { ConnectionItem } from '~/api/connections';
import { FormattedConn } from '~/store/connections';

export type SourceMapItem = {
  reg: string;
  name: string;
};

/** 单元格的渲染形态，决定 ConnectionTable 走哪个分支 */
export type ConnectionColumnKind = 'ctrl' | 'host' | 'chip' | 'chain' | 'text';

export type ConnectionColumn = {
  id: string;
  /** i18n key */
  labelKey: string;
  /** 最小宽度（px）；grow 为空时即固定宽度 */
  width: number;
  /** >0 时参与剩余空间按比例分配 */
  grow?: number;
  /** grow 分配的上限（px）。到顶后余量让给别的列，都到顶就留白，避免宽屏下把几列撑得过分 */
  max?: number;
  align?: 'left' | 'right';
  kind: ConnectionColumnKind;
  sortable?: boolean;
  /** 数值列按数字比较，其余按 localeCompare */
  numeric?: boolean;
  /** 首次点该列时的方向，缺省为 asc */
  defaultSortDir?: SortDir;
};

export const ALL_SOURCE_IP = 'ALL_SOURCE_IP';
export const SOURCE_MAP_STORAGE_KEY = 'sourceMap';
export const COLUMNS_STORAGE_KEY = 'connColumns';
export const SETTINGS_STORAGE_KEY = 'connSettings';
export const SORT_STORAGE_KEY = 'connSort';

/** 全部可用列，同时也是「可用列」面板里的展示顺序 */
export const CONNECTION_COLUMNS: ConnectionColumn[] = [
  { id: 'ctrl', labelKey: 'c_ctrl', width: 34, kind: 'ctrl', sortable: false },
  { id: 'start', labelKey: 'c_time', width: 84, kind: 'text', numeric: true },
  { id: 'type', labelKey: 'c_type', width: 120, kind: 'chip' },
  { id: 'source', labelKey: 'c_source', width: 120, kind: 'text' },
  { id: 'host', labelKey: 'c_host', width: 100, grow: 1.6, max: 380, kind: 'host' },
  { id: 'rule', labelKey: 'c_rule', width: 70, grow: 1, max: 220, kind: 'chip' },
  { id: 'chains', labelKey: 'c_chains', width: 140, grow: 1.15, max: 280, kind: 'chain' },
  {
    id: 'downloadSpeedCurr',
    labelKey: 'c_dl_speed',
    width: 80,
    align: 'right',
    kind: 'text',
    numeric: true,
    defaultSortDir: 'desc',
  },
  {
    id: 'uploadSpeedCurr',
    labelKey: 'c_ul_speed',
    width: 80,
    align: 'right',
    kind: 'text',
    numeric: true,
    defaultSortDir: 'desc',
  },
  {
    id: 'download',
    labelKey: 'c_dl',
    width: 74,
    align: 'right',
    kind: 'text',
    numeric: true,
    defaultSortDir: 'desc',
  },
  {
    id: 'upload',
    labelKey: 'c_ul',
    width: 74,
    align: 'right',
    kind: 'text',
    numeric: true,
    defaultSortDir: 'desc',
  },
  { id: 'process', labelKey: 'c_process', width: 110, kind: 'text' },
  { id: 'chainNode', labelKey: 'c_node', width: 110, kind: 'text' },
  {
    id: 'sourcePort',
    labelKey: 'c_source_port',
    width: 72,
    align: 'right',
    kind: 'text',
    numeric: true,
  },
  { id: 'destinationIP', labelKey: 'c_destination_ip', width: 130, kind: 'text' },
  { id: 'network', labelKey: 'c_network', width: 70, kind: 'text' },
  { id: 'sniffHost', labelKey: 'c_sni', width: 130, kind: 'text' },
  { id: 'outboundType', labelKey: 'c_outbound_type', width: 84, kind: 'text' },
];

export const CONNECTION_COLUMN_MAP: Record<string, ConnectionColumn> = Object.fromEntries(
  CONNECTION_COLUMNS.map((column) => [column.id, column]),
);

export const CONNECTION_COLUMNS_DEFAULT: string[] = [
  'ctrl',
  'start',
  'type',
  'source',
  'host',
  'rule',
  'chains',
  'downloadSpeedCurr',
  'uploadSpeedCurr',
  'download',
  'upload',
];

export type SortDir = 'asc' | 'desc';
export type SortState = { key: string; dir: SortDir };
/** 默认按连接时长升序，也就是最新建立的连接排在最上面 */
export const SORT_DEFAULT: SortState = { key: 'start', dir: 'asc' };

export function getDefaultSortDir(key: string): SortDir {
  return CONNECTION_COLUMN_MAP[key]?.defaultSortDir ?? 'asc';
}

export type ConnectionSettings = {
  /** 匹配规则 / 代理链的正则，命中的连接不显示 */
  hideRegex: string;
  hideEnabled: boolean;
  /** 代理链显示每一跳而非只显示末端节点 */
  fullChain: boolean;
};

export const CONNECTION_SETTINGS_DEFAULT: ConnectionSettings = {
  hideRegex: 'DIRECT|dns-out',
  hideEnabled: false,
  fullChain: false,
};

function readJSON<T>(key: string): T | null {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function getInitialSourceMap(): SourceMapItem[] {
  return readJSON<SourceMapItem[]>(SOURCE_MAP_STORAGE_KEY) ?? [];
}

export function saveSourceMap(sourceMap: SourceMapItem[]) {
  localStorage.setItem(SOURCE_MAP_STORAGE_KEY, JSON.stringify(sourceMap));
}

export function getInitialColumns(): string[] {
  const saved = readJSON<string[]>(COLUMNS_STORAGE_KEY);
  if (!Array.isArray(saved)) return [...CONNECTION_COLUMNS_DEFAULT];
  // 存量数据里可能有已经不存在的列 id，过滤掉；全空则退回默认
  const valid = saved.filter((id) => CONNECTION_COLUMN_MAP[id]);
  return valid.length > 0 ? valid : [...CONNECTION_COLUMNS_DEFAULT];
}

export function saveColumns(columns: string[]) {
  localStorage.setItem(COLUMNS_STORAGE_KEY, JSON.stringify(columns));
}

export function getInitialSettings(): ConnectionSettings {
  return {
    ...CONNECTION_SETTINGS_DEFAULT,
    ...(readJSON<ConnectionSettings>(SETTINGS_STORAGE_KEY) ?? {}),
  };
}

export function saveSettings(settings: ConnectionSettings) {
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}

export function getInitialSort(): SortState {
  const saved = readJSON<SortState>(SORT_STORAGE_KEY);
  if (!saved || !CONNECTION_COLUMN_MAP[saved.key]) return { ...SORT_DEFAULT };
  return { key: saved.key, dir: saved.dir === 'desc' ? 'desc' : 'asc' };
}

export function saveSort(sort: SortState) {
  localStorage.setItem(SORT_STORAGE_KEY, JSON.stringify(sort));
}

export function arrayToIdKv<T extends { id: string }>(items: T[]) {
  const result: Record<string, T> = {};
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    result[item.id] = item;
  }
  return result;
}

function hasSubstring(value: string | undefined, pattern: string) {
  return (value ?? '').toLowerCase().includes(pattern.toLowerCase());
}

/**
 * 「隐藏连接」用的正则。用户输入随时可能是半截的非法正则，编译失败时返回 null
 * 表示不过滤，而不是把整张表清空。
 */
export function buildHideRegExp(settings: ConnectionSettings): RegExp | null {
  if (!settings.hideEnabled) return null;
  const pattern = settings.hideRegex.trim();
  if (!pattern) return null;
  try {
    return new RegExp(pattern, 'i');
  } catch {
    return null;
  }
}

export function filterConns(
  conns: FormattedConn[],
  keyword: string,
  sourceIp: string,
  hideRegExp: RegExp | null,
) {
  let result = conns;

  if (hideRegExp) {
    result = result.filter((conn) => !(hideRegExp.test(conn.chains) || hideRegExp.test(conn.rule)));
  }

  if (keyword !== '') {
    result = result.filter((conn) =>
      [
        conn.host,
        conn.source,
        conn.sourcePort,
        conn.destinationIP,
        conn.chains,
        conn.rule,
        conn.type,
        conn.network,
        conn.process,
      ].some((field) => hasSubstring(field, keyword)),
    );
  }

  if (sourceIp !== ALL_SOURCE_IP) {
    result = result.filter((conn) => conn.sourceIP === sourceIp);
  }

  return result;
}

export function sortConns(conns: FormattedConn[], sort: SortState): FormattedConn[] {
  const column = CONNECTION_COLUMN_MAP[sort.key];
  if (!column || column.sortable === false) return conns;

  const factor = sort.dir === 'desc' ? -1 : 1;
  return [...conns].sort((a, b) => {
    const x = (a as any)[sort.key];
    const y = (b as any)[sort.key];
    if (column.numeric) return (Number(x) - Number(y)) * factor;
    return String(x ?? '').localeCompare(String(y ?? '')) * factor;
  });
}

// getNameFromSource runs per connection per second; compile each pattern once.
// No `g` flag: a cached RegExp with `g` would make `.test` stateful (lastIndex).
// An invalid pattern (e.g. half-typed in the settings form) caches as null and
// matches nothing instead of throwing during render.
const sourceRegExpCache = new Map<string, RegExp | null>();
function getSourceRegExp(reg: string): RegExp | null {
  const cached = sourceRegExpCache.get(reg);
  if (cached !== undefined) return cached;
  let regExp: RegExp | null;
  try {
    regExp = new RegExp(reg.slice(1));
  } catch {
    regExp = null;
  }
  sourceRegExpCache.set(reg, regExp);
  return regExp;
}

export function getNameFromSource(
  source: string,
  sourceMap: SourceMapItem[],
  defaultVal?: string,
): string {
  let sourceName = defaultVal ?? source;

  sourceMap.forEach(({ reg, name }) => {
    if (!reg) return;

    if (reg.startsWith('/')) {
      if (name && getSourceRegExp(reg)?.test(source)) {
        sourceName = `${name}(${source})`;
      }
    } else if (source === reg && name) {
      sourceName = `${name}(${source})`;
    }
  });

  return sourceName;
}

// applySourceNames labels each connection's `source` with the client tag that
// matches its sourceIP. The stream keeps `source` as the raw `ip:port` and
// reuses it across ticks, so tags must be applied here to reach connections
// that were already open when a tag was added or edited.
export function applySourceNames(
  conns: FormattedConn[],
  sourceMap: SourceMapItem[],
): FormattedConn[] {
  if (!sourceMap.some((item) => item.reg && item.name)) return conns;
  return conns.map((conn) => {
    const raw = `${conn.sourceIP}:${conn.sourcePort}`;
    const source = getNameFromSource(conn.sourceIP, sourceMap, raw);
    return source === raw ? conn : { ...conn, source };
  });
}

// formatDistance's output only depends on the elapsed time rounded to whole
// minutes, but computing it is relatively expensive and it runs per visible
// row per second — cache by (locale, minutes).
const elapsedTextCache = new Map<string, string>();
export function formatElapsed(ms: number, locale: Locale): string {
  const minutes = Math.round(ms / 60000);
  const key = `${locale.code}:${minutes}`;
  let text = elapsedTextCache.get(key);
  if (text === undefined) {
    text = formatDistance(minutes * 60000, 0, { locale });
    elapsedTextCache.set(key, text);
  }
  return text;
}

export function modifyChains(chains: string[]): string {
  if (!Array.isArray(chains) || chains.length === 0) {
    return '';
  }

  if (chains.length === 1) {
    return chains[0];
  }

  return `${chains[chains.length - 1]} -> ${chains[0]}`;
}

/** chains 数组是从末端节点往外层策略组排的，展示时反过来读更顺 */
export function formatFullChain(chains: string[]): string {
  if (!Array.isArray(chains) || chains.length === 0) return '';
  return [...chains].reverse().join(' → ');
}

function getOutboundType(node: string): string {
  if (node === 'DIRECT') return 'Direct';
  if (node.startsWith('REJECT') || node === 'PASS') return 'Reject';
  return 'Proxy';
}

export function formatConnectionDataItem(
  item: ConnectionItem,
  prevKv: Record<string, FormattedConn>,
  now: number,
): FormattedConn {
  const { id, upload, download, start, chains, rule, rulePayload, metadata } = item;
  const prev = prevKv[id];

  if (prev) {
    return {
      ...prev,
      upload,
      download,
      start: now - prev.startTime,
      downloadSpeedCurr: download - prev.download,
      uploadSpeedCurr: upload - prev.upload,
    };
  }

  const {
    host,
    destinationPort,
    destinationIP,
    remoteDestination,
    network,
    type,
    sourceIP,
    sourcePort,
    process,
    sniffHost,
  } = metadata;
  const host2 = host || destinationIP;
  const startTime = new Date(start).valueOf();
  const chainList = Array.isArray(chains) ? chains : [];
  const chainNode = chainList[0] ?? '';
  const chainGroup = chainList.length > 1 ? chainList[chainList.length - 1] : '';

  return {
    id,
    upload,
    download,
    start: now - startTime,
    startTime,
    chains: modifyChains(chainList),
    chainNode,
    chainGroup,
    chainsFull: formatFullChain(chainList),
    outboundType: getOutboundType(chainNode),
    rule: !rulePayload ? rule : `${rule} :: ${rulePayload}`,
    ...metadata,
    host: `${host2}:${destinationPort}`,
    sniffHost: sniffHost || '-',
    type: `${type}(${network})`,
    source: `${sourceIP}:${sourcePort}`,
    downloadSpeedCurr: 0,
    uploadSpeedCurr: 0,
    process: process || '-',
    destinationIP: remoteDestination || destinationIP || host,
  };
}
