import { useSuspenseQuery } from '@tanstack/react-query';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

import type { UpgradeChannel } from '~/api/configs';
import * as logsApi from '~/api/logs';
import { fetchVersion } from '~/api/version';
import { useCoreUpdate } from '~/hooks/useCoreUpdate';
import {
  ActionResult,
  fetchConfigs,
  flushFakeIPPool,
  reloadConfigFile,
  restartCore,
  updateConfigs,
  upgradeCore,
  upgradeGeo,
  upgradeUI,
} from '~/store/configs';
import { openModal } from '~/store/modals';
import { toast } from '~/store/toast';
import { ClashGeneralConfig, ClashTunConfig, DispatchFn } from '~/store/types';
import { unregisterAndReload } from '~/swRegistration';
import { ClashAPIConfig } from '~/types';

const { useCallback, useEffect, useRef, useState } = React;

// 面板更新成功后到自动刷新之间的间隔，够看清通知即可
const UI_RELOAD_DELAY_MS = 1500;

// 值同时是 i18n key 的前缀：`${action}_success` / `${action}_failed`
type ConfigAction = 'reload_config' | 'restart_core' | 'upgrade_geo' | 'flush_fake_ip_pool';

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

  // 正在执行的一次性动作，null 表示空闲；用来给按钮做 loading 并防止重复点击
  const [pendingAction, setPendingAction] = useState<ConfigAction | null>(null);

  const runAction = useCallback(
    async (action: ConfigAction, thunk: (dispatch: DispatchFn) => Promise<ActionResult>) => {
      if (pendingAction !== null) return;
      setPendingAction(action);
      const result = await dispatch(thunk);
      setPendingAction(null);
      if (result.ok) {
        toast('success', t(`${action}_success`));
      } else {
        toast('error', t(`${action}_failed`, { message: result.message }));
      }
    },
    [dispatch, pendingAction, t],
  );

  const handleReloadConfigFile = useCallback(() => {
    runAction('reload_config', reloadConfigFile(apiConfig));
  }, [apiConfig, runAction]);

  const handleRestartCore = useCallback(() => {
    runAction('restart_core', restartCore(apiConfig));
  }, [apiConfig, runAction]);

  // 正在更新的通道，null 表示空闲；同时用来给两个按钮做 loading / 互斥
  const [upgradingChannel, setUpgradingChannel] = useState<UpgradeChannel | null>(null);

  const handleUpgradeCore = useCallback(
    async (channel: UpgradeChannel) => {
      if (upgradingChannel !== null) return;
      setUpgradingChannel(channel);
      const result = await dispatch(upgradeCore(apiConfig, channel));
      setUpgradingChannel(null);
      if (result.ok) {
        toast('success', t('upgrade_core_success'));
      } else {
        toast('error', t('upgrade_core_failed', { message: result.message }));
      }
    },
    [apiConfig, dispatch, t, upgradingChannel],
  );

  const handleUpgradeGeo = useCallback(() => {
    runAction('upgrade_geo', upgradeGeo(apiConfig));
  }, [apiConfig, runAction]);

  const [isUpgradingUI, setIsUpgradingUI] = useState(false);

  const handleUpgradeUI = useCallback(async () => {
    if (isUpgradingUI) return;
    setIsUpgradingUI(true);
    const result = await dispatch(upgradeUI(apiConfig));
    setIsUpgradingUI(false);
    if (result.ok) {
      toast('success', t('upgrade_ui_success'));
      // 留一点时间让通知露个面，再带着清缓存整页刷新
      setTimeout(unregisterAndReload, UI_RELOAD_DELAY_MS);
    } else {
      toast('error', t('upgrade_ui_failed', { message: result.message }));
    }
  }, [apiConfig, dispatch, isUpgradingUI, t]);

  const handleFlushFakeIPPool = useCallback(() => {
    runAction('flush_fake_ip_pool', flushFakeIPPool(apiConfig));
  }, [apiConfig, runAction]);

  return {
    configState,
    openAPIConfigModal,
    handleInputOnChange,
    handleInputOnBlur,
    handleReloadConfigFile,
    handleRestartCore,
    handleUpgradeCore,
    upgradingChannel,
    handleUpgradeGeo,
    handleUpgradeUI,
    isUpgradingUI,
    handleFlushFakeIPPool,
    pendingAction,
    versionQuery,
    coreUpdate,
  };
}
