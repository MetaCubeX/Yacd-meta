import { useMutation, useSuspenseQuery } from '@tanstack/react-query';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

import * as configsAPI from '~/api/configs';
import type { UpgradeChannel } from '~/api/configs';
import * as logsApi from '~/api/logs';
import { fetchVersion } from '~/api/version';
import { useCoreUpdate } from '~/hooks/useCoreUpdate';
import { readErrorMessage } from '~/misc/request-helper';
import { fetchConfigs, updateConfigs } from '~/store/configs';
import { openModal } from '~/store/modals';
import { toast } from '~/store/toast';
import { ClashGeneralConfig, ClashTunConfig, DispatchFn } from '~/store/types';
import { unregisterAndReload } from '~/swRegistration';
import { ClashAPIConfig } from '~/types';

const { useCallback, useEffect, useRef, useState } = React;

// 面板更新成功后到自动刷新之间的间隔，够看清通知即可
const UI_RELOAD_DELAY_MS = 1500;

// 值同时是 i18n key 的前缀：`${action}_success` / `${action}_failed`
type ConfigAction =
  | 'reload_config'
  | 'restart_core'
  | 'upgrade_core'
  | 'upgrade_geo'
  | 'upgrade_ui'
  | 'flush_fake_ip_pool';

type ConfigActionVars = { action: ConfigAction; channel?: UpgradeChannel };

const CONFIG_ACTIONS: Record<
  ConfigAction,
  {
    send: (apiConfig: ClashAPIConfig, channel?: UpgradeChannel) => Promise<Response>;
    logLabel: string;
    // 动作成功后配置可能变了，要回头拉一次 configs
    refetchConfigs: boolean;
  }
> = {
  reload_config: {
    send: configsAPI.reloadConfigFile,
    logLabel: 'Error reload config file',
    refetchConfigs: true,
  },
  // mihomo 先回 200 再重启进程，紧接着拉配置大概率撞上重启窗口，失败会弹出后端配置框
  restart_core: {
    send: configsAPI.restartCore,
    logLabel: 'Error restart core',
    refetchConfigs: false,
  },
  // 内核更新成功后会自行重启，理由同上
  upgrade_core: {
    send: configsAPI.upgradeCore,
    logLabel: 'Error upgrade core',
    refetchConfigs: false,
  },
  upgrade_geo: {
    send: configsAPI.upgradeGeo,
    logLabel: 'Error upgrade geo',
    refetchConfigs: true,
  },
  // 只是把面板静态文件换掉，内核配置没变
  upgrade_ui: {
    send: configsAPI.upgradeUI,
    logLabel: 'Error upgrade ui',
    refetchConfigs: false,
  },
  flush_fake_ip_pool: {
    send: configsAPI.flushFakeIPPool,
    logLabel: 'Error flush FakeIP pool',
    refetchConfigs: true,
  },
};

type UpdateAppConfigFn = (name: string, value: unknown) => void;

function useConfigVersionQuery(apiConfig: ClashAPIConfig) {
  return useSuspenseQuery({
    queryKey: ['/version', apiConfig],
    queryFn: () => fetchVersion('/version', apiConfig),
  });
}

export function useConfigState(configs: ClashGeneralConfig) {
  const [configState, setConfigStateInternal] = useState(configs);
  const refConfigs = useRef(configs);

  useEffect(() => {
    if (refConfigs.current !== configs) {
      setConfigStateInternal(configs);
    }
    refConfigs.current = configs;
  }, [configs]);

  const setConfigState = useCallback((name: string, value: any) => {
    setConfigStateInternal((prev) => ({ ...prev, [name]: value }));
  }, []);

  const setTunConfigState = useCallback((name: string, value: any) => {
    setConfigStateInternal((prev) => ({
      ...prev,
      tun: { ...prev.tun, [name]: value } as ClashTunConfig,
    }));
  }, []);

  return {
    configState,
    setConfigState,
    setTunConfigState,
  };
}

export function useConfigPage({
  apiConfig,
  configs,
  dispatch,
  updateAppConfig,
}: {
  apiConfig: ClashAPIConfig;
  configs: ClashGeneralConfig;
  dispatch: DispatchFn;
  updateAppConfig: UpdateAppConfigFn;
}) {
  const { t } = useTranslation();

  useEffect(() => {
    dispatch(fetchConfigs(apiConfig));
  }, [apiConfig, dispatch]);

  const { configState, setConfigState, setTunConfigState } = useConfigState(configs);
  const versionQuery = useConfigVersionQuery(apiConfig);
  const coreUpdate = useCoreUpdate(apiConfig);

  const openAPIConfigModal = useCallback(() => {
    dispatch(openModal('apiConfig'));
  }, [dispatch]);

  const handleInputOnChange = useCallback(
    ({ name, value }: { name: string; value: any }) => {
      switch (name) {
        case 'mode':
        case 'log-level':
        case 'allow-lan':
        case 'sniffing':
          setConfigState(name, value);
          dispatch(updateConfigs(apiConfig, { [name]: value }));
          if (name === 'log-level') {
            logsApi.reconnect({ ...apiConfig, logLevel: value });
          }
          break;
        case 'mitm-port':
        case 'redir-port':
        case 'socks-port':
        case 'mixed-port':
        case 'port':
          if (value !== '') {
            const num = parseInt(value, 10);
            if (num < 0 || num > 65535) return;
          }
          setConfigState(name, value);
          break;
        case 'enable':
        case 'stack':
          setTunConfigState(name, value);
          dispatch(updateConfigs(apiConfig, { tun: { [name]: value } }));
          break;
        default:
          return;
      }
    },
    [apiConfig, dispatch, setConfigState, setTunConfigState],
  );

  const handleInputOnBlur = useCallback(
    (
      e:
        | React.FocusEvent<HTMLSelectElement | HTMLInputElement>
        | React.ChangeEvent<HTMLSelectElement | HTMLInputElement>,
    ) => {
      const { name, value } = e.target;

      switch (name) {
        case 'port':
        case 'socks-port':
        case 'mixed-port':
        case 'redir-port':
        case 'mitm-port': {
          const num = parseInt(value, 10);
          if (num < 0 || num > 65535) return;
          dispatch(updateConfigs(apiConfig, { [name]: num }));
          break;
        }
        case 'latencyTestUrl':
          updateAppConfig(name, value);
          break;
        case 'device name':
        case 'interface name':
          break;
        default:
          throw new Error(`unknown input name ${name}`);
      }
    },
    [apiConfig, dispatch, updateAppConfig],
  );

  // 所有动作共用一个 mutation，同一时刻只跑一个：重载、重启、升级会互相打断。
  // 不能拿 isPending 拦：它经 notifyManager 异步才更新，紧跟着的第二次点击会漏过去
  const inFlightRef = useRef(false);

  const { mutate, isPending, variables } = useMutation({
    mutationFn: async ({ action, channel }: ConfigActionVars) => {
      const { send, logLabel } = CONFIG_ACTIONS[action];
      const res = await send(apiConfig, channel);
      if (!res.ok) throw new Error(await readErrorMessage(res, logLabel));
    },
    onSuccess: (_data, { action }) => {
      toast('success', t(`${action}_success`));
      if (CONFIG_ACTIONS[action].refetchConfigs) dispatch(fetchConfigs(apiConfig));
      // 留一点时间让通知露个面，再带着清缓存整页刷新
      if (action === 'upgrade_ui') setTimeout(unregisterAndReload, UI_RELOAD_DELAY_MS);
    },
    onError: (err, { action }) => {
      console.error(CONFIG_ACTIONS[action].logLabel, err);
      toast('error', t(`${action}_failed`, { message: err.message }));
    },
    onSettled: () => {
      inFlightRef.current = false;
    },
  });

  const runAction = useCallback(
    (action: ConfigAction, channel?: UpgradeChannel) => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      mutate({ action, channel });
    },
    [mutate],
  );

  const pending = isPending ? variables : undefined;
  const pendingAction = pending?.action ?? null;
  const upgradingChannel = pendingAction === 'upgrade_core' ? (pending?.channel ?? null) : null;

  return {
    configState,
    openAPIConfigModal,
    handleInputOnChange,
    handleInputOnBlur,
    runAction,
    pendingAction,
    upgradingChannel,
    versionQuery,
    coreUpdate,
  };
}
