import { trimTrailingSlash } from '~/misc/utils';
import { ClashAPIConfig, LogsAPIConfig } from '~/types';

const headersCommon = { 'Content-Type': 'application/json' };

function genCommonHeaders({ secret }: { secret?: string }) {
  const h: Record<string, string> = { ...headersCommon };
  if (secret) {
    h['Authorization'] = `Bearer ${secret}`;
  }
  return h;
}
function buildWebSocketURLBase(baseURL: string, params: URLSearchParams, endpoint: string) {
  const qs = '?' + params.toString();
  const url = new URL(baseURL);
  url.protocol === 'https:' ? (url.protocol = 'wss:') : (url.protocol = 'ws:');
  return `${trimTrailingSlash(url.href)}${endpoint}${qs}`;
}

export function getURLAndInit({ baseURL, secret }: ClashAPIConfig) {
  const headers = genCommonHeaders({ secret });
  return {
    url: baseURL,
    init: { headers },
  };
}

// 非 JSON 错误原文最多展示这么长，免得把整段响应塞进通知里
const MAX_ERROR_TEXT_LENGTH = 200;

// mihomo 出错时返回 { "message": "..." }。返回给界面的是精简过的提示，
// 完整的状态和原文一律打到控制台，方便排查
export async function readErrorMessage(res: Response, logLabel = 'Request failed') {
  const statusLine = res.statusText || String(res.status);
  let raw = '';
  try {
    raw = await res.text();
  } catch (err) {
    // body 读不出来，退回状态行
    console.error(logLabel, res.status, res.statusText, res.url, err);
    return statusLine;
  }
  console.error(logLabel, res.status, res.statusText, res.url, raw);
  const text = raw.trim();
  try {
    const payload = JSON.parse(text);
    if (payload && typeof payload.message === 'string') return payload.message;
  } catch {
    // 不是 JSON，下面按原文处理
  }
  // 地址填错或经过反代时可能拿到一整页 HTML，这种原文没法读，退回状态行
  const contentType = res.headers.get('content-type') ?? '';
  if (!text || contentType.includes('text/html') || text.startsWith('<')) return statusLine;
  return text.length > MAX_ERROR_TEXT_LENGTH ? `${text.slice(0, MAX_ERROR_TEXT_LENGTH)}…` : text;
}

export function buildWebSocketURL(apiConfig: ClashAPIConfig, endpoint: string) {
  const { baseURL, secret } = apiConfig;
  // 没有 secret 时不能带 token，URLSearchParams 会把 undefined 变成字面量 "undefined"
  const params = new URLSearchParams(secret ? { token: secret } : {});

  return buildWebSocketURLBase(baseURL, params, endpoint);
}

export function buildLogsWebSocketURL(apiConfig: LogsAPIConfig, endpoint: string) {
  const { baseURL, secret, logLevel } = apiConfig;
  const params = new URLSearchParams(
    secret ? { token: secret, level: logLevel } : { level: logLevel },
  );

  return buildWebSocketURLBase(baseURL, params, endpoint);
}
