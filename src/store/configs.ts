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

export function fetchConfigs(apiConfig: ClashAPIConfig) {
  return async (dispatch: DispatchFn, getState: GetStateFn) => {
    let res: Response;
    try {
      res = await configsAPI.fetchConfigs(apiConfig);
    } catch (err) {
      // TypeError and AbortError
      dispatch(openModal('apiConfig'));
      return;
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
  partialConfg: TunPartial<ClashGeneralConfig>
) {
  return async (dispatch: DispatchFn) => {
    configsAPI
      .updateConfigs(apiConfig, partialConfg)
      .then(
        (res) => {
          if (res.ok === false) {
            // eslint-disable-next-line no-console
            console.log('Error update configs', res.statusText);
          }
        },
        (err) => {
          // eslint-disable-next-line no-console
          console.log('Error update configs', err);
          throw err;
        }
      )
      .then(() => {
        dispatch(fetchConfigs(apiConfig));
      });

    dispatch('storeConfigsOptimisticUpdateConfigs', (s) => {
      s.configs.configs = { ...s.configs.configs, ...partialConfg } as generalConfig;
    });
  };
}

export function reloadConfigFile(apiConfig: ClashAPIConfig) {
  return async (dispatch: DispatchFn) => {
    configsAPI
      .reloadConfigFile(apiConfig)
      .then(
        (res) => {
          if (res.ok === false) {
            // eslint-disable-next-line no-console
            console.log('Error reload config file', res.statusText);
          }
        },
        (err) => {
          // eslint-disable-next-line no-console
          console.log('Error reload config file', err);
          throw err;
        }
      )
      .then(() => {
        dispatch(fetchConfigs(apiConfig));
      });
  };
}

export function updateGeoDatabasesFile(apiConfig: ClashAPIConfig) {
  return async (dispatch: DispatchFn) => {
    configsAPI
      .updateGeoDatabasesFile(apiConfig)
      .then(
        (res) => {
          if (res.ok === false) {
            // eslint-disable-next-line no-console
            console.log('Error update geo databases file', res.statusText);
          }
        },
        (err) => {
          // eslint-disable-next-line no-console
          console.log('Error update geo databases file', err);
          throw err;
        }
      )
      .then(() => {
        dispatch(fetchConfigs(apiConfig));
      });
  };
}

export function flushFakeIPPool(apiConfig: ClashAPIConfig) {
  return async (dispatch: DispatchFn) => {
    configsAPI
      .flushFakeIPPool(apiConfig)
      .then(
        (res) => {
          if (res.ok === false) {
            // eslint-disable-next-line no-console
            console.log('Error flush FakeIP pool', res.statusText);
          }
        },
        (err) => {
          // eslint-disable-next-line no-console
          console.log('Error flush FakeIP pool', err);
          throw err;
        }
      )
      .then(() => {
        dispatch(fetchConfigs(apiConfig));
      });
  };
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
