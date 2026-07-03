import * as React from 'react';
import { useTranslation } from 'react-i18next';

import Select from '~/components/shared/Select';
import { PROXY_SORT_OPTIONS } from '~/modules/proxies/utils';

import { useStoreActions } from '../StateProvider';
import Switch from '../SwitchThemed';

import s from './Settings.module.scss';

const { useCallback } = React;

type AppConfig = {
  proxySortBy: string;
  hideUnavailableProxies: boolean;
  autoCloseOldConns: boolean;
  proxiesLayout: string;
  proxyGroupByProvider: boolean;
  latencyTestUrl: string;
  latencyTestTimeout: number;
  latencyTestExpectedStatus: string;
  preferBackendLatencyTestUrl: boolean;
  providerHealthcheckTimeout: number;
};

type Props = {
  appConfig: AppConfig;
};

export default function Settings({ appConfig }: Props) {
  const {
    app: { updateAppConfig },
  } = useStoreActions();

  const handleProxySortByOnChange = useCallback(
    (e) => {
      updateAppConfig('proxySortBy', e.target.value);
    },
    [updateAppConfig],
  );

  const handleHideUnavailablesSwitchOnChange = useCallback(
    (v) => {
      updateAppConfig('hideUnavailableProxies', v);
    },
    [updateAppConfig],
  );

  const handleLatencyUrlChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateAppConfig('latencyTestUrl', e.target.value);
    },
    [updateAppConfig],
  );

  const handleLatencyUrlClear = useCallback(() => {
    updateAppConfig('latencyTestUrl', '');
  }, [updateAppConfig]);

  const handleLatencyTimeoutChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = parseInt(e.target.value, 10);
      if (!isNaN(v) && v > 0) updateAppConfig('latencyTestTimeout', v);
    },
    [updateAppConfig],
  );

  const handleProviderHealthcheckTimeoutChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = parseInt(e.target.value, 10);
      if (!isNaN(v) && v > 0) updateAppConfig('providerHealthcheckTimeout', v);
    },
    [updateAppConfig],
  );

  const handleExpectedStatusChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateAppConfig('latencyTestExpectedStatus', e.target.value.trim());
    },
    [updateAppConfig],
  );

  const handleExpectedStatusClear = useCallback(() => {
    updateAppConfig('latencyTestExpectedStatus', '');
  }, [updateAppConfig]);

  const { t } = useTranslation();
  return (
    <>
      <div className={s.labeledInput}>
        <span>{t('latency_test_url')}</span>
        <div className={s.urlInputWrapper}>
          <input
            className={s.urlInput}
            type="text"
            value={appConfig.latencyTestUrl}
            onChange={handleLatencyUrlChange}
            spellCheck={false}
          />
          {appConfig.latencyTestUrl && (
            <button className={s.urlClearBtn} onClick={handleLatencyUrlClear} tabIndex={-1}>
              ×
            </button>
          )}
        </div>
      </div>
      <div className={s.labeledInput}>
        <span>{t('latency_test_timeout')}</span>
        <div className={s.timeoutInputWrapper}>
          <input
            className={s.timeoutInput}
            type="number"
            min={100}
            max={30000}
            step={100}
            value={appConfig.latencyTestTimeout}
            onChange={handleLatencyTimeoutChange}
          />
          <span className={s.timeoutUnit}>ms</span>
        </div>
      </div>
      <div className={s.labeledInput}>
        <span>{t('provider_healthcheck_timeout')}</span>
        <div className={s.timeoutInputWrapper}>
          <input
            className={s.timeoutInput}
            type="number"
            min={1000}
            max={60000}
            step={500}
            value={appConfig.providerHealthcheckTimeout}
            onChange={handleProviderHealthcheckTimeoutChange}
          />
          <span className={s.timeoutUnit}>ms</span>
        </div>
      </div>
      <div className={s.labeledInput}>
        <span>{t('latency_test_expected_status')}</span>
        <div className={s.urlInputWrapper}>
          <input
            className={s.urlInput}
            type="text"
            placeholder="200/204"
            value={appConfig.latencyTestExpectedStatus}
            onChange={handleExpectedStatusChange}
            spellCheck={false}
          />
          {appConfig.latencyTestExpectedStatus && (
            <button className={s.urlClearBtn} onClick={handleExpectedStatusClear} tabIndex={-1}>
              ×
            </button>
          )}
        </div>
      </div>
      <div className={s.labeledInput}>
        <span>{t('prefer_backend_test_url')}</span>
        <div>
          <Switch
            name="preferBackendLatencyTestUrl"
            checked={appConfig.preferBackendLatencyTestUrl}
            onChange={(v) => updateAppConfig('preferBackendLatencyTestUrl', v)}
          />
        </div>
      </div>
      <hr />
      <div className={s.labeledInput}>
        <span>{t('sort_in_grp')}</span>
        <div>
          <Select
            options={PROXY_SORT_OPTIONS.map((o) => {
              return [o[0], t(o[1])];
            })}
            selected={appConfig.proxySortBy}
            onChange={handleProxySortByOnChange}
          />
        </div>
      </div>
      <hr />
      <div className={s.labeledInput}>
        <span>{t('hide_unavail_proxies')}</span>
        <div>
          <Switch
            name="hideUnavailableProxies"
            checked={appConfig.hideUnavailableProxies}
            onChange={handleHideUnavailablesSwitchOnChange}
          />
        </div>
      </div>
      <div className={s.labeledInput}>
        <span>{t('auto_close_conns')}</span>
        <div>
          <Switch
            name="autoCloseOldConns"
            checked={appConfig.autoCloseOldConns}
            onChange={(v) => updateAppConfig('autoCloseOldConns', v)}
          />
        </div>
      </div>
      <div className={s.labeledInput}>
        <span>{t('double_column_layout')}</span>
        <div>
          <Switch
            name="proxiesLayout"
            checked={appConfig.proxiesLayout === 'double'}
            onChange={(v) => updateAppConfig('proxiesLayout', v ? 'double' : 'single')}
          />
        </div>
      </div>
      <div className={s.labeledInput}>
        <span>{t('group_by_provider')}</span>
        <div>
          <Switch
            name="proxyGroupByProvider"
            checked={appConfig.proxyGroupByProvider}
            onChange={(v) => updateAppConfig('proxyGroupByProvider', v)}
          />
        </div>
      </div>
    </>
  );
}
