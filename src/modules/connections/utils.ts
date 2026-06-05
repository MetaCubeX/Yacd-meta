import { ConnectionItem } from '~/api/connections';
import { FormattedConn } from '~/store/connections';

export type SourceMapItem = {
  reg: string;
  name: string;
};

export type ConnectionColumn = {
  accessor: string;
  Header?: string;
  show?: boolean;
  sortDescFirst?: boolean;
};

export const ALL_SOURCE_IP = 'ALL_SOURCE_IP';
export const SOURCE_MAP_STORAGE_KEY = 'sourceMap';
export const CONNECTIONS_PADDING_BOTTOM = 30;
export const HIDDEN_COLUMNS_STORAGE_KEY = 'hiddenColumns';
export const COLUMNS_STORAGE_KEY = 'columns';

const sortDescFirst = true;

export const HIDDEN_COLUMNS_DEFAULT = ['id'];
export const CONNECTION_COLUMNS_DEFAULT: ConnectionColumn[] = [
  { accessor: 'id', show: false },
  { Header: 'c_type', accessor: 'type' },
  { Header: 'c_process', accessor: 'process' },
  { Header: 'c_host', accessor: 'host' },
  { Header: 'c_rule', accessor: 'rule' },
  { Header: 'c_chains', accessor: 'chains' },
  { Header: 'c_time', accessor: 'start' },
  { Header: 'c_dl_speed', accessor: 'downloadSpeedCurr', sortDescFirst },
  { Header: 'c_ul_speed', accessor: 'uploadSpeedCurr', sortDescFirst },
  { Header: 'c_dl', accessor: 'download', sortDescFirst },
  { Header: 'c_ul', accessor: 'upload', sortDescFirst },
  { Header: 'c_source', accessor: 'source' },
  { Header: 'c_destination_ip', accessor: 'destinationIP' },
  { Header: 'c_destination_location', accessor: 'destinationLocation' },
  { Header: 'c_sni', accessor: 'sniffHost' },
  { Header: 'c_ctrl', accessor: 'ctrl' },
];

export function getInitialSourceMap(): SourceMapItem[] {
  const sourceMap = localStorage.getItem(SOURCE_MAP_STORAGE_KEY);
  return sourceMap ? JSON.parse(sourceMap) : [];
}

export function saveSourceMap(sourceMap: SourceMapItem[]) {
  localStorage.setItem(SOURCE_MAP_STORAGE_KEY, JSON.stringify(sourceMap));
}

export function getInitialHiddenColumns(): string[] {
  const hiddenColumns = localStorage.getItem(HIDDEN_COLUMNS_STORAGE_KEY);
  return hiddenColumns ? JSON.parse(hiddenColumns) : [...HIDDEN_COLUMNS_DEFAULT];
}

export function saveHiddenColumns(hiddenColumns: string[]) {
  localStorage.setItem(HIDDEN_COLUMNS_STORAGE_KEY, JSON.stringify(hiddenColumns));
}

export function getInitialColumns(): ConnectionColumn[] {
  const savedColumns = localStorage.getItem(COLUMNS_STORAGE_KEY);
  const columnOrder: ConnectionColumn[] | null = savedColumns ? JSON.parse(savedColumns) : null;

  if (!columnOrder) {
    return [...CONNECTION_COLUMNS_DEFAULT];
  }

  return [...CONNECTION_COLUMNS_DEFAULT].sort((prev, next) => {
    const prevIdx = columnOrder.findIndex((column) => column.accessor === prev.accessor);
    const nextIdx = columnOrder.findIndex((column) => column.accessor === next.accessor);

    if (prevIdx === -1) {
      return 1;
    }

    if (nextIdx === -1) {
      return -1;
    }

    return prevIdx - nextIdx;
  });
}

export function saveColumns(columns: ConnectionColumn[]) {
  localStorage.setItem(COLUMNS_STORAGE_KEY, JSON.stringify(columns));
}

export function arrayToIdKv<T extends { id: string }>(items: T[]) {
  const result: Record<string, T> = {};
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    result[item.id] = item;
  }
  return result;
}

function hasSubstring(value: string, pattern: string) {
  return value.toLowerCase().includes(pattern.toLowerCase());
}

function filterConnIps(conns: FormattedConn[], ipStr: string) {
  return conns.filter((each) => each.sourceIP === ipStr);
}

export function filterConns(conns: FormattedConn[], keyword: string, sourceIp: string) {
  let result = conns;
  if (keyword !== '') {
    result = conns.filter((conn) =>
      [
        conn.host,
        conn.sourceIP,
        conn.sourcePort,
        conn.destinationIP,
        conn.chains,
        conn.rule,
        conn.type,
        conn.network,
        conn.process,
      ].some((field) => hasSubstring(field, keyword))
    );
  }
  if (sourceIp !== ALL_SOURCE_IP) {
    result = filterConnIps(result, sourceIp);
  }

  return result;
}

export function getNameFromSource(
  source: string,
  sourceMap: SourceMapItem[],
  defaultVal?: string
): string {
  let sourceName = defaultVal ?? source;

  sourceMap.forEach(({ reg, name }) => {
    if (!reg) return;

    if (reg.startsWith('/')) {
      const regExp = new RegExp(reg.replace('/', ''), 'g');

      if (regExp.test(source) && name) {
        sourceName = `${name}(${source})`;
      }
    } else if (source === reg && name) {
      sourceName = `${name}(${source})`;
    }
  });

  return sourceName;
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

export function formatConnectionDataItem(
  item: ConnectionItem,
  prevKv: Record<string, FormattedConn>,
  now: number,
  sourceMap: SourceMapItem[]
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
  const source = `${sourceIP}:${sourcePort}`;
  const startTime = new Date(start).valueOf();

  return {
    id,
    upload,
    download,
    start: now - startTime,
    startTime,
    chains: modifyChains(chains),
    rule: !rulePayload ? rule : `${rule} :: ${rulePayload}`,
    ...metadata,
    host: `${host2}:${destinationPort}`,
    sniffHost: sniffHost || '-',
    type: `${type}(${network})`,
    source: getNameFromSource(sourceIP, sourceMap, source),
    downloadSpeedCurr: 0,
    uploadSpeedCurr: 0,
    process: process || '-',
    destinationIP: remoteDestination || destinationIP || host,
  };
}