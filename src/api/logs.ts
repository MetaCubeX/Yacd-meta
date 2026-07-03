import { pad0 } from '~/misc/utils';
import { Log } from '~/store/types';
import { LogsAPIConfig } from '~/types';

import { buildLogsWebSocketURL, getURLAndInit } from '../misc/request-helper';

type AppendLogFn = (x: Log) => void;
enum WebSocketReadyState {
  Connecting = 0,
  Open = 1,
  Closing = 2,
  Closed = 3,
}

const endpoint = '/logs';
const textDecoder = new TextDecoder('utf-8');

const getRandomStr = () => {
  return Math.floor((1 + Math.random()) * 0x10000).toString(16);
};

let even = false;
let decoded = '';
let ws: WebSocket;
let controller: AbortController;
let usingFetchFallback = false;
let currentConnStr: string;

type UnsubscribeFn = () => void;
// the WS/fetch stream is a module-level singleton so switching away from and
// back to the Logs page doesn't tear down and re-handshake the connection —
// only unsubscribe here, the connection itself outlives any single mount
const subscribers: AppendLogFn[] = [];

function broadcast(log: Log) {
  subscribers.forEach((listener) => listener(log));
}

function appendData(s: string) {
  let o: Partial<Log>;
  try {
    o = JSON.parse(s);
  } catch (err) {

    console.log('JSON.parse error', s);
    return;
  }

  const now = new Date();
  const time = formatDate(now);
  o.time = time;
  o.id = +now - 0 + getRandomStr();
  o.even = even = !even;
  broadcast(o as Log);
}

function formatDate(d: Date) {
  // 19-03-09 12:45
  const YY = d.getFullYear() % 100;
  const MM = pad0(d.getMonth() + 1, 2);
  const dd = pad0(d.getDate(), 2);
  const HH = pad0(d.getHours(), 2);
  const mm = pad0(d.getMinutes(), 2);
  const ss = pad0(d.getSeconds(), 2);
  return `${YY}-${MM}-${dd} ${HH}:${mm}:${ss}`;
}

function pump(reader: ReadableStreamDefaultReader) {
  return reader.read().then(({ done, value }) => {
    const str = textDecoder.decode(value, { stream: !done });
    decoded += str;

    const splits = decoded.split('\n');

    const lastSplit = splits[splits.length - 1];

    for (let i = 0; i < splits.length - 1; i++) {
      appendData(splits[i]);
    }

    if (done) {
      appendData(lastSplit);
      decoded = '';


      console.log('GET /logs streaming done');
      usingFetchFallback = false;
      return;
    } else {
      decoded = lastSplit;
    }
    return pump(reader);
  });
}

/** loose hashing of the connection configuration */
function makeConnStr(c: LogsAPIConfig) {
  const keys = Object.keys(c);
  keys.sort();
  return keys.map((k) => c[k]).join('|');
}

function isConnectionLive() {
  return (ws && ws.readyState === WebSocketReadyState.Open) || usingFetchFallback;
}

function teardown() {
  if (ws) {
    ws.close();
    ws = undefined;
  }
  if (controller) {
    controller.abort();
    controller = undefined;
  }
  usingFetchFallback = false;
  decoded = '';
}

function subscribe(listener: AppendLogFn): UnsubscribeFn {
  subscribers.push(listener);
  return function unsubscribe() {
    const idx = subscribers.indexOf(listener);
    if (idx !== -1) subscribers.splice(idx, 1);
  };
}

function openConnection(apiConfig: LogsAPIConfig) {
  const url = buildLogsWebSocketURL(apiConfig, endpoint);
  ws = new WebSocket(url);
  ws.addEventListener('error', () => {
    ws = undefined;
    fetchLogsWithFetch(apiConfig);
  });
  ws.addEventListener('message', function (event) {
    appendData(event.data);
  });
}

export function fetchLogs(
  apiConfig: LogsAPIConfig,
  appendLog: AppendLogFn
): UnsubscribeFn | undefined {
  if (apiConfig.logLevel === 'uninit') return undefined;

  const connStr = makeConnStr(apiConfig);
  if (isConnectionLive() && connStr === currentConnStr) {
    return subscribe(appendLog);
  }

  teardown();
  currentConnStr = connStr;
  openConnection(apiConfig);
  return subscribe(appendLog);
}

/** explicitly stop streaming, e.g. when the user hits "pause" */
export function stop() {
  teardown();
}

/** explicitly force a fresh connection, e.g. after changing log level or hitting "resume" */
export function reconnect(apiConfig: LogsAPIConfig) {
  teardown();
  currentConnStr = makeConnStr(apiConfig);
  openConnection(apiConfig);
}

function fetchLogsWithFetch(apiConfig: LogsAPIConfig) {
  if (usingFetchFallback) return;
  usingFetchFallback = true;

  controller = new AbortController();
  const signal = controller.signal;

  const { url, init } = getURLAndInit(apiConfig);
  fetch(url + endpoint + '?level=' + apiConfig.logLevel, {
    ...init,
    signal,
  }).then(
    (response) => {
      const reader = response.body.getReader();
      pump(reader);
    },
    (err) => {
      usingFetchFallback = false;
      if (signal.aborted) return;


      console.log('GET /logs error:', err.message);
    },
  );
}
