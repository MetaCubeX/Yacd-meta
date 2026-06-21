import { ClashAPIConfig } from '~/types';

import { buildWebSocketURL, getURLAndInit } from '../misc/request-helper';

const endpoint = '/memory';
const textDecoder = new TextDecoder('utf-8');

const Size = 150;

const memory = {
  labels: Array(Size)
    .fill(0)
    .map((_, i) => Date.now() - (Size - i) * 1000),
  inuse: Array(Size).fill(null),
  oslimit: Array(Size).fill(null),

  size: Size,
  subscribers: [],
  appendData(o: { inuse: number; oslimit: number }) {
    this.inuse.shift();
    this.oslimit.shift();
    this.labels.shift();

    const l = Date.now();
    this.inuse.push(o.inuse);
    this.oslimit.push(o.oslimit);
    this.labels.push(l);

    this.subscribers.forEach((f) => f(o));
  },

  subscribe(listener: (x: any) => void) {
    this.subscribers.push(listener);
    return () => {
      const idx = this.subscribers.indexOf(listener);
      this.subscribers.splice(idx, 1);
    };
  },
};

let fetched = false;
let decoded = '';

function parseAndAppend(x: string) {
  memory.appendData(JSON.parse(x));
}

function pump(reader: ReadableStreamDefaultReader) {
  return reader.read().then(({ done, value }) => {
    const str = textDecoder.decode(value, { stream: !done });
    decoded += str;

    const splits = decoded.split('\n');

    const lastSplit = splits[splits.length - 1];

    for (let i = 0; i < splits.length - 1; i++) {
      parseAndAppend(splits[i]);
    }

    if (done) {
      parseAndAppend(lastSplit);
      decoded = '';

       
      console.log('GET /memory streaming done');
      fetched = false;
      return;
    } else {
      decoded = lastSplit;
    }
    return pump(reader);
  });
}

// 1 OPEN
// other value CLOSED
// similar to ws readyState but not the same
// https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/readyState
let wsState: number;
function fetchData(apiConfig: ClashAPIConfig) {
  if (fetched || wsState === 1) return memory;
  wsState = 1;
  const url = buildWebSocketURL(apiConfig, endpoint);
  const ws = new WebSocket(url);
  ws.addEventListener('error', function (_ev) {
    wsState = 3;
  });
  ws.addEventListener('close', function (_ev) {
    wsState = 3;
    fetchDataWithFetch(apiConfig);
  });
  ws.addEventListener('message', function (event) {
    parseAndAppend(event.data);
  });
  return memory;
}

function fetchDataWithFetch(apiConfig: ClashAPIConfig) {
  if (fetched) return memory;
  fetched = true;
  const { url, init } = getURLAndInit(apiConfig);
  fetch(url + endpoint, init).then(
    (response) => {
      if (response.ok) {
        const reader = response.body.getReader();
        pump(reader);
      } else {
        fetched = false;
      }
    },
    (err) => {
       
      console.log('fetch /memory error', err);
      fetched = false;
    }
  );
  return memory;
}

export { fetchData };
