import { ClashAPIConfig } from '~/types';

import { buildWebSocketURL, getURLAndInit } from '../misc/request-helper';

const endpoint = '/connections';

const fetched = false;

interface Subscriber {
  listner: unknown; // on data received, listener will be called with data
  onClose: () => void; // on stream closed, onClose will be called
}

const subscribers = [];

// see also https://github.com/Dreamacro/clash/blob/dev/constant/metadata.go#L41
type UUID = string;
type ConnNetwork = 'tcp' | 'udp';
type ConnType = 'HTTP' | 'HTTP Connect' | 'Socks5' | 'Redir' | 'Unknown';
export type ConnectionItem = {
  id: UUID;
  metadata: {
    network: ConnNetwork;
    type: ConnType;
    sourceIP: string;
    destinationIP: string;
    remoteDestination: string;
    sourcePort: string;
    destinationPort: string;
    host: string;
    process?: string;
    sniffHost?: string;
  };
  upload: number;
  download: number;
  // e.g. "2019-11-30T22:48:13.416668+08:00",
  start: string;
  chains: string[];
  // e.g. 'Match', 'DomainKeyword'
  rule: string;
  rulePayload?: string;
};
type ConnectionsData = {
  downloadTotal: number;
  uploadTotal: number;
  connections: Array<ConnectionItem>;
};

function appendData(s: string) {
  let o: ConnectionsData;
  try {
    o = JSON.parse(s);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.log('JSON.parse error', JSON.parse(s));
  }
  subscribers.forEach((s) => s.listner(o));
}

type UnsubscribeFn = () => void;

let wsState: number;
export function fetchData(
  apiConfig: ClashAPIConfig,
  listener: unknown,
  onClose: () => void
): UnsubscribeFn | void {
  if (fetched || wsState === 1) {
    if (listener)
      return subscribe({
        listner: listener,
        onClose,
      });
  }
  wsState = 1;
  const url = buildWebSocketURL(apiConfig, endpoint);
  const ws = new WebSocket(url);
  ws.addEventListener('error', () => {
    wsState = 3;
    subscribers.forEach((s) => s.onClose());
    subscribers.length = 0;
  });
  ws.addEventListener('close', () => {
    wsState = 3;
    subscribers.forEach((s) => s.onClose());
    subscribers.length = 0;
  });
  ws.addEventListener('message', (event) => appendData(event.data));
  if (listener)
    return subscribe({
      listner: listener,
      onClose,
    });
}

function subscribe(subscriber: Subscriber): UnsubscribeFn {
  subscribers.push(subscriber);
  return function unsubscribe() {
    const idx = subscribers.indexOf(subscriber);
    subscribers.splice(idx, 1);
  };
}

export async function closeAllConnections(apiConfig: ClashAPIConfig) {
  const { url, init } = getURLAndInit(apiConfig);
  return await fetch(url + endpoint, { ...init, method: 'DELETE' });
}

export async function fetchConns(apiConfig: ClashAPIConfig) {
  const { url, init } = getURLAndInit(apiConfig);
  return await fetch(url + endpoint, { ...init });
}

export async function closeConnById(apiConfig: ClashAPIConfig, id: string) {
  const { url: baseURL, init } = getURLAndInit(apiConfig);
  const url = `${baseURL}${endpoint}/${id}`;
  return await fetch(url, { ...init, method: 'DELETE' });
}
