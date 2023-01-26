import { getURLAndInit } from '~/misc/request-helper';
import { ClashGeneralConfig, TunPartial } from '~/store/types';
import { ClashAPIConfig } from '~/types';

const endpoint = '/configs';
const updateGeoDatabasesFileEndpoint = '/configs/geo';
const flushFakeIPPoolEndpoint = '/cache/fakeip/flush';

export async function fetchConfigs(apiConfig: ClashAPIConfig) {
  const { url, init } = getURLAndInit(apiConfig);
  return await fetch(url + endpoint, init);
}

// TODO support PUT /configs
// req body
// { Path: string }

type ClashConfigPartial = TunPartial<ClashGeneralConfig>;
function configsPatchWorkaround(o: ClashConfigPartial) {
  // backward compatibility for older clash  using `socket-port`
  if ('socks-port' in o) {
    o['socket-port'] = o['socks-port'];
  }
  return o;
}

export async function updateConfigs(apiConfig: ClashAPIConfig, o: ClashConfigPartial) {
  const { url, init } = getURLAndInit(apiConfig);
  const body = JSON.stringify(configsPatchWorkaround(o));
  return await fetch(url + endpoint, { ...init, body, method: 'PATCH' });
}

export async function reloadConfigFile(apiConfig: ClashAPIConfig) {
  const { url, init } = getURLAndInit(apiConfig);
  const body = '{"path": "", "payload": ""}';
  return await fetch(url + endpoint + '?force=true', { ...init, body, method: 'PUT' });
}

export async function updateGeoDatabasesFile(apiConfig: ClashAPIConfig) {
  const { url, init } = getURLAndInit(apiConfig);
  const body = '{"path": "", "payload": ""}';
  return await fetch(url + updateGeoDatabasesFileEndpoint, { ...init, body, method: 'POST' });
}

export async function flushFakeIPPool(apiConfig: ClashAPIConfig) {
  const { url, init } = getURLAndInit(apiConfig);
  return await fetch(url + flushFakeIPPoolEndpoint, { ...init, method: 'POST' });
}
