import { getURLAndInit } from '~/misc/request-helper';
import { ClashAPIConfig } from '~/types';

/** VersionData is GET /version reduced to what the UI needs. `version` is absent when the request failed. */
export type VersionData = {
  version?: string;
  core: 'mihomo' | 'sing-box';
};

/**
 * toVersionData classifies a raw /version body. sing-box's clash API answers
 * `{ version: "sing-box …", premium: true, meta: true }`; mihomo never sets `premium`, so that
 * flag alone tells them apart. Any other body, including `{}`, is treated as mihomo.
 */
export function toVersionData(raw: { version?: string; premium?: boolean }): VersionData {
  return { version: raw.version, core: raw.premium === true ? 'sing-box' : 'mihomo' };
}

/** Raw GET /version, for callers that need the status and error body rather than a fallback. */
export function requestVersion(apiConfig: ClashAPIConfig, signal?: AbortSignal) {
  const { url, init } = getURLAndInit(apiConfig);
  return fetch(url + '/version', { ...init, signal });
}

// 丢包型的不可达地址要等系统 TCP 连接超时才失败，Windows 上实测约 21 秒
const FETCH_VERSION_TIMEOUT_MS = 5000;

export async function fetchVersion(
  endpoint: string,
  apiConfig: ClashAPIConfig,
): Promise<VersionData> {
  let json = {};
  try {
    const { url, init } = getURLAndInit(apiConfig);
    const res = await fetch(url + endpoint, {
      ...init,
      signal: AbortSignal.timeout(FETCH_VERSION_TIMEOUT_MS),
    });
    if (res.ok) {
      json = await res.json();
    }
  } catch (err) {
    // log and ignore

    console.log(`failed to fetch ${endpoint}`, err);
  }
  return toVersionData(json);
}
