import { DEFAULT_LATENCY_TEST_URL } from '../misc/constants';
import { getURLAndInit } from '../misc/request-helper';
import { ClashAPIConfig } from '../types';

const endpoint = '/proxies';

// Build the query string for a delay/healthcheck request. `expected` (HTTP status
// like '200/204' or '200-299') is optional and only sent when non-empty.
function buildDelayQuery(latencyTestUrl: string, timeout: number, expected?: string) {
  const params = new URLSearchParams({ timeout: String(timeout), url: latencyTestUrl });
  if (expected) params.set('expected', expected);
  return params.toString();
}

/*
$ curl "http://127.0.0.1:8080/proxies/Proxy" -XPUT -d '{ "name": "ss3" }' -i
HTTP/1.1 400 Bad Request
Content-Type: text/plain; charset=utf-8

{"error":"Selector update error: Proxy does not exist"}

~
$ curl "http://127.0.0.1:8080/proxies/GLOBAL" -XPUT -d '{ "name": "Proxy" }' -i
HTTP/1.1 204 No Content
*/

// 401 / unreachable backend must not throw: these feed a suspense query, and a throw there
// unmounts the whole app (including the backend config modal that fetchConfigs opens).
export async function fetchProxies(config: ClashAPIConfig) {
  try {
    const { url, init } = getURLAndInit(config);
    const res = await fetch(url + endpoint, init);
    if (res.ok) return await res.json();
  } catch (err) {
    console.log('failed to fetch proxies', err);
  }
  return { proxies: {} };
}

export async function requestToSwitchProxy(
  apiConfig: ClashAPIConfig,
  name1: string,
  name2: string,
) {
  const body = { name: name2 };
  const { url, init } = getURLAndInit(apiConfig);
  const fullURL = `${url}${endpoint}/${encodeURIComponent(name1)}`;
  return await fetch(fullURL, {
    ...init,
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export async function requestToUnfixProxy(apiConfig: ClashAPIConfig, name: string) {
  const { url, init } = getURLAndInit(apiConfig);
  return await fetch(`${url}${endpoint}/${encodeURIComponent(name)}`, {
    ...init,
    method: 'DELETE',
  });
}

export async function requestDelayForProxy(
  apiConfig: ClashAPIConfig,
  name: string,
  latencyTestUrl = DEFAULT_LATENCY_TEST_URL,
  timeout = 5000,
  expected?: string,
) {
  const { url, init } = getURLAndInit(apiConfig);
  const qs = buildDelayQuery(latencyTestUrl, timeout, expected);
  const fullURL = `${url}${endpoint}/${encodeURIComponent(name)}/delay?${qs}`;
  return await fetch(fullURL, init);
}

export async function requestDelayForProxyGroup(
  apiConfig: ClashAPIConfig,
  name: string,
  latencyTestUrl = DEFAULT_LATENCY_TEST_URL,
  timeout = 5000,
  expected?: string,
) {
  const { url, init } = getURLAndInit(apiConfig);
  const qs = buildDelayQuery(latencyTestUrl, timeout, expected);
  const fullUrl = `${url}/group/${encodeURIComponent(name)}/delay?${qs}`;
  return await fetch(fullUrl, init);
}

// Same failure contract as fetchProxies; 404 comes from cores without provider support.
export async function fetchProviderProxies(config: ClashAPIConfig) {
  try {
    const { url, init } = getURLAndInit(config);
    const res = await fetch(url + '/providers/proxies', init);
    if (res.ok) return await res.json();
  } catch (err) {
    console.log('failed to fetch provider proxies', err);
  }
  return { providers: {} };
}

export async function updateProviderByName(config: ClashAPIConfig, name: string) {
  const { url, init } = getURLAndInit(config);
  const options = { ...init, method: 'PUT' };
  return await fetch(url + '/providers/proxies/' + encodeURIComponent(name), options);
}

export async function healthcheckProviderByName(
  config: ClashAPIConfig,
  name: string,
  signal?: AbortSignal,
) {
  const { url, init } = getURLAndInit(config);
  const options = { ...init, method: 'GET', signal };
  return await fetch(
    url + '/providers/proxies/' + encodeURIComponent(name) + '/healthcheck',
    options,
  );
}

export async function healthcheckProviderProxy(
  config: ClashAPIConfig,
  providerName: string,
  proxyName: string,
  latencyTestUrl = DEFAULT_LATENCY_TEST_URL,
  timeout = 5000,
  expected?: string,
) {
  const { url, init } = getURLAndInit(config);
  const qs = buildDelayQuery(latencyTestUrl, timeout, expected);
  const options = { ...init, method: 'GET' };
  return await fetch(
    `${url}/providers/proxies/${encodeURIComponent(providerName)}/${encodeURIComponent(
      proxyName,
    )}/healthcheck?${qs}`,
    options,
  );
}
