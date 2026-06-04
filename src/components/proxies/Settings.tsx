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
  const { t } = useTranslation();
  return (
    <>
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
