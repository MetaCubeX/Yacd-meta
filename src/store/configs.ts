import { readErrorMessage } from '~/misc/request-helper';
import {
  ClashGeneralConfig,
  DispatchFn,
  GetStateFn,
  State,
  StateConfigs,
  TunPartial,
} from '~/store/types';
import { ClashAPIConfig } from '~/types';

import * as configsAPI from '../api/configs';
import * as trafficAPI from '../api/traffic';

import { openModal } from './modals';

export const getConfigs = (s: State) => s.configs.configs;
export const getHaveFetched = (s: State) => s.configs.haveFetchedConfig;
export const getLogLevel = (s: State) => s.configs.configs['log-level'];

const STARTUP_TIMEOUT_MS = 2000;

export function fetchConfigs(apiConfig: ClashAPIConfig) {
  return async (dispatch: DispatchFn, getState: GetStateFn) => {
    let res: Response;
    const haveFetched = getHaveFetched(getState());
    const controller = new AbortController();
    const timeoutId = haveFetched ? null : setTimeout(() => controller.abort(), STARTUP_TIMEOUT_MS);
    try {
      res = await configsAPI.fetchConfigs(apiConfig, haveFetched ? undefined : controller.signal);
    } catch (err) {
      // TypeError and AbortError (includes timeout)
      dispatch(openModal('apiConfig'));
      return;
    } finally {
      if (timeoutId !== null) clearTimeout(timeoutId);
    }

    if (!res.ok) {
      console.log('Error fetch configs', res.statusText);
      dispatch(openModal('apiConfig'));
      return;
    }

    const payload = await res.json();

    dispatch('store/configs#fetchConfigs', (s) => {
      s.configs.configs = payload;
    });

    const haveFetchedConfig = getHaveFetched(getState());

    if (haveFetchedConfig) {
      // normally user will land on the "traffic chart" page first
      // calling this here will let the data start streaming
      // the traffic chart should already subscribed to the streaming
      trafficAPI.fetchData(apiConfig);
    } else {
      dispatch(markHaveFetchedConfig());
    }
  };
}

function markHaveFetchedConfig() {
  return (dispatch: DispatchFn) => {
    dispatch('store/configs#markHaveFetchedConfig', (s: State) => {
      s.configs.haveFetchedConfig = true;
    });
  };
}

type generalConfig = Omit<ClashGeneralConfig, 'tun'>;

export function updateConfigs(
  apiConfig: ClashAPIConfig,
  partialConfg: TunPartial<ClashGeneralConfig>,
) {
  return async (dispatch: DispatchFn) => {
    configsAPI
      .updateConfigs(apiConfig, partialConfg)
      .then(
        (res) => {
          if (res.ok === false) {
            console.log('Error update configs', res.statusText);
          }
        },
        (err) => {
          console.log('Error update configs', err);
          throw err;
        },
      )
      .then(() => {
        dispatch(fetchConfigs(apiConfig));
      });

    dispatch('storeConfigsOptimisticUpdateConfigs', (s) => {
      s.configs.configs = { ...s.configs.configs, ...partialConfg } as generalConfig;
    });
  };
}

export type ActionResult = { ok: boolean; message?: string };

// 把一次性动作类接口的响应收敛成 { ok, message }：2xx 算成功，否则带上接口返回的内容，交给调用方决定怎么提示
async function toActionResult(request: Promise<Response>, logLabel: string): Promise<ActionResult> {
  let res: Response;
  try {
    res = await request;
  } catch (err) {
    console.error(logLabel, err);
    return { ok: false, message: err instanceof Error ? err.message : String(err) };
  }
  if (!res.ok) {
    return { ok: false, message: await readErrorMessage(res, logLabel) };
  }
  return { ok: true };
}

// 动作成功后配置可能变了，回头拉一次 configs
function thenRefetchConfigs(
  apiConfig: ClashAPIConfig,
  send: (apiConfig: ClashAPIConfig) => Promise<Response>,
  logLabel: string,
) {
  return async (dispatch: DispatchFn): Promise<ActionResult> => {
    const result = await toActionResult(send(apiConfig), logLabel);
    if (result.ok) dispatch(fetchConfigs(apiConfig));
    return result;
  };
}

export function reloadConfigFile(apiConfig: ClashAPIConfig) {
  return thenRefetchConfigs(apiConfig, configsAPI.reloadConfigFile, 'Error reload config file');
}

export function restartCore(apiConfig: ClashAPIConfig) {
  // mihomo 先回 200 再重启进程，紧接着拉配置大概率撞上重启窗口，失败会弹出后端配置框
  return async (): Promise<ActionResult> =>
    toActionResult(configsAPI.restartCore(apiConfig), 'Error restart core');
}

export function upgradeCore(apiConfig: ClashAPIConfig, channel?: configsAPI.UpgradeChannel) {
  // 内核更新成功后会自行重启，这里不再立刻拉配置，否则大概率打在重启窗口上
  return async (): Promise<ActionResult> =>
    toActionResult(configsAPI.upgradeCore(apiConfig, channel), 'Error upgrade core');
}

export function upgradeGeo(apiConfig: ClashAPIConfig) {
  return thenRefetchConfigs(apiConfig, configsAPI.upgradeGeo, 'Error upgrade geo');
}

export function upgradeUI(apiConfig: ClashAPIConfig) {
  // 只是把面板静态文件换掉，内核配置没变，不需要回头拉 configs
  return async (): Promise<ActionResult> =>
    toActionResult(configsAPI.upgradeUI(apiConfig), 'Error upgrade ui');
}

export function flushFakeIPPool(apiConfig: ClashAPIConfig) {
  return thenRefetchConfigs(apiConfig, configsAPI.flushFakeIPPool, 'Error flush FakeIP pool');
}

export const initialState: StateConfigs = {
  configs: {
    port: 7890,
    'socks-port': 7891,
    'mixed-port': 0,
    'redir-port': 0,
    'tproxy-port': 0,
    'mitm-port': 0,
    'allow-lan': false,
    mode: 'rule',
    'log-level': 'uninit',
    sniffing: false,
    tun: {
      enable: false,
      device: '',
      stack: '',
      'dns-hijack': [],
      'auto-route': false,
    },
  },
  haveFetchedConfig: false,
};
