import * as React from 'react';
import { useTranslation } from 'react-i18next';

import { SegmentedControl } from '~/components/shared/SegmentedControl';
import Switch from '~/components/shared/SwitchThemed';
import {
  getProxySortDirection,
  getProxySortKey,
  HEALTHCHECK_TIMEOUT_PRESETS,
  LATENCY_TIMEOUT_PRESETS,
  nextProxySortBy,
  ProxiesAppConfig,
  ProxySortKey,
  withCurrentTimeout,
} from '~/modules/proxies/utils';
import { useStoreActions } from '~/store/StateProvider';

import s from './Settings.module.scss';

const { useCallback, useMemo } = React;

type Props = {
  appConfig: ProxiesAppConfig;
};

function Row({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className={s.row}>
      <span className={s.rowLabel}>{label}</span>
      <div className={s.rowControl}>{children}</div>
    </div>
  );
}

/** 单独一行、控件占满宽度（输入框、分段控件用） */
function StackedRow({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className={s.stackedRow}>
      <span className={s.rowLabel}>{label}</span>
      {children}
    </div>
  );
}

function ClearableInput({
  value,
  placeholder,
  onChange,
  onClear,
  ariaLabel,
}: {
  value: string;
  placeholder?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
  ariaLabel: string;
}) {
  return (
    <div className={s.inputWrapper}>
      <input
        className={s.input}
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={onChange}
        spellCheck={false}
        aria-label={ariaLabel}
      />
      {value ? (
        <button className={s.clearBtn} onClick={onClear} tabIndex={-1} aria-label="clear">
          ×
        </button>
      ) : null}
    </div>
  );
}

export default function Settings({ appConfig }: Props) {
  const {
    app: { updateAppConfig },
  } = useStoreActions();
  const { t } = useTranslation();

  const handleLatencyUrlChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => updateAppConfig('latencyTestUrl', e.target.value),
    [updateAppConfig],
  );
  const handleLatencyUrlClear = useCallback(
    () => updateAppConfig('latencyTestUrl', ''),
    [updateAppConfig],
  );

  const handleExpectedStatusChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      updateAppConfig('latencyTestExpectedStatus', e.target.value.trim()),
    [updateAppConfig],
  );
  const handleExpectedStatusClear = useCallback(
    () => updateAppConfig('latencyTestExpectedStatus', ''),
    [updateAppConfig],
  );

  const secondsOptions = useCallback(
    (presets: number[], current: number) =>
      withCurrentTimeout(presets, current).map((ms) => ({
        value: ms,
        label: t('secs', { n: Math.round(ms / 100) / 10 }),
      })),
    [t],
  );

  const latencyTimeoutOptions = useMemo(
    () => secondsOptions(LATENCY_TIMEOUT_PRESETS, appConfig.latencyTestTimeout),
    [secondsOptions, appConfig.latencyTestTimeout],
  );
  const healthcheckTimeoutOptions = useMemo(
    () => secondsOptions(HEALTHCHECK_TIMEOUT_PRESETS, appConfig.providerHealthcheckTimeout),
    [secondsOptions, appConfig.providerHealthcheckTimeout],
  );

  const sortKey = getProxySortKey(appConfig.proxySortBy);
  const sortDirection = getProxySortDirection(appConfig.proxySortBy);
  const sortOptions = useMemo(() => {
    const arrow = sortDirection === 'Desc' ? ' ↓' : ' ↑';
    const withArrow = (key: ProxySortKey, text: string) =>
      key === sortKey && key !== 'Natural' ? `${text}${arrow}` : text;
    return [
      { value: 'Natural' as const, label: t('sort_natural'), title: t('order_natural') },
      { value: 'Latency' as const, label: withArrow('Latency', t('sort_latency')) },
      { value: 'Name' as const, label: withArrow('Name', t('sort_name')) },
    ];
  }, [sortKey, sortDirection, t]);

  const handleSortChange = useCallback(
    (key: ProxySortKey) =>
      updateAppConfig('proxySortBy', nextProxySortBy(appConfig.proxySortBy, key)),
    [appConfig.proxySortBy, updateAppConfig],
  );

  return (
    <div className={s.panel}>
      <p className={s.sectionTitle}>{t('settings_latency')}</p>

      <StackedRow label={t('latency_test_url')}>
        <ClearableInput
          value={appConfig.latencyTestUrl}
          onChange={handleLatencyUrlChange}
          onClear={handleLatencyUrlClear}
          ariaLabel={t('latency_test_url')}
        />
      </StackedRow>

      <StackedRow label={t('latency_test_timeout')}>
        <SegmentedControl
          options={latencyTimeoutOptions}
          value={appConfig.latencyTestTimeout}
          onChange={(v) => updateAppConfig('latencyTestTimeout', v)}
          label={t('latency_test_timeout')}
        />
      </StackedRow>

      <StackedRow label={t('provider_healthcheck_timeout')}>
        <SegmentedControl
          options={healthcheckTimeoutOptions}
          value={appConfig.providerHealthcheckTimeout}
          onChange={(v) => updateAppConfig('providerHealthcheckTimeout', v)}
          label={t('provider_healthcheck_timeout')}
        />
      </StackedRow>

      <StackedRow label={t('latency_test_expected_status')}>
        <ClearableInput
          value={appConfig.latencyTestExpectedStatus}
          placeholder="200/204"
          onChange={handleExpectedStatusChange}
          onClear={handleExpectedStatusClear}
          ariaLabel={t('latency_test_expected_status')}
        />
      </StackedRow>

      <Row label={t('prefer_backend_test_url')}>
        <Switch
          name="preferBackendLatencyTestUrl"
          checked={appConfig.preferBackendLatencyTestUrl}
          onChange={(v: boolean) => updateAppConfig('preferBackendLatencyTestUrl', v)}
        />
      </Row>

      <hr className={s.divider} />
      <p className={s.sectionTitle}>{t('settings_display')}</p>

      <StackedRow label={t('sort_in_grp')}>
        <SegmentedControl
          options={sortOptions}
          value={sortKey}
          onChange={handleSortChange}
          label={t('sort_in_grp')}
        />
      </StackedRow>

      <Row label={t('hide_unavail_proxies')}>
        <Switch
          name="hideUnavailableProxies"
          checked={appConfig.hideUnavailableProxies}
          onChange={(v: boolean) => updateAppConfig('hideUnavailableProxies', v)}
        />
      </Row>

      <Row label={t('double_column_layout')}>
        <Switch
          name="proxiesLayout"
          checked={appConfig.proxiesLayout === 'double'}
          onChange={(v: boolean) => updateAppConfig('proxiesLayout', v ? 'double' : 'single')}
        />
      </Row>

      <Row label={t('group_by_provider')}>
        <Switch
          name="proxyGroupByProvider"
          checked={appConfig.proxyGroupByProvider}
          onChange={(v: boolean) => updateAppConfig('proxyGroupByProvider', v)}
        />
      </Row>

      <hr className={s.divider} />
      <p className={s.sectionTitle}>{t('settings_behavior')}</p>

      <Row label={t('auto_close_conns')}>
        <Switch
          name="autoCloseOldConns"
          checked={appConfig.autoCloseOldConns}
          onChange={(v: boolean) => updateAppConfig('autoCloseOldConns', v)}
        />
      </Row>
    </div>
  );
}
