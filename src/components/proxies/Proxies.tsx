import cx from 'clsx';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

import Button from '~/components/Button';
import ContentHeader from '~/components/ContentHeader';
import { ClosePrevConns } from '~/components/proxies/ClosePrevConns';
import { ProxyGroup } from '~/components/proxies/ProxyGroup';
import { ProxyPageFab } from '~/components/proxies/ProxyPageFab';
import { ProxyProvider } from '~/components/proxies/ProxyProvider';
import Settings from '~/components/proxies/Settings';
import BaseModal from '~/components/shared/BaseModal';
import { TextFilter } from '~/components/shared/TextFitler';
import { Tooltip } from '~/components/shared/Tooltip';
import { useStoreActions } from '~/components/StateProvider';
import Equalizer from '~/components/svg/Equalizer';
import { useProxiesPage } from '~/modules/proxies/hooks';
import { formatQty } from '~/modules/proxies/utils';
import { proxyFilterText } from '~/store/proxies';
import { DelayMapping, DispatchFn, FormattedProxyProvider, ProxiesMapping } from '~/store/types';
import { ClashAPIConfig } from '~/types';

import s0 from './Proxies.module.scss';

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
  dispatch: DispatchFn;
  groupNames: string[];
  proxies: ProxiesMapping;
  delay: DelayMapping;
  collapsibleIsOpen: Record<string, boolean>;
  proxyProviders: FormattedProxyProvider[];
  apiConfig: ClashAPIConfig;
  showModalClosePrevConns: boolean;
  appConfig: AppConfig;
};

export default function Proxies({
  dispatch,
  groupNames,
  proxies,
  delay,
  collapsibleIsOpen,
  proxyProviders,
  apiConfig,
  showModalClosePrevConns,
  appConfig,
}: Props) {
  // the panel's configured test URL only feeds the latency-color threshold here;
  // the actual URL used per request is resolved in the store thunks
  const httpsLatencyTest = appConfig.latencyTestUrl.startsWith('https://');
  const {
    isSettingsModalOpen,
    openSettingsModal,
    closeSettingsModal,
    activeTab,
    setActiveTab,
    handleTabKeyDown,
    proxyGroups,
    providers,
  } = useProxiesPage({
    dispatch,
    apiConfig,
    groupNames,
    proxyProviders,
    proxiesLayout: appConfig.proxiesLayout,
  });

  const {
    proxies: { closeModalClosePrevConns, closePrevConnsAndTheModal },
  } = useStoreActions();

  const { t } = useTranslation();

  const content =
    activeTab === 'proxies' ? (
      <div
        className={cx(s0.groupsContainer, {
          [s0.doubleColumn]: appConfig.proxiesLayout === 'double',
        })}
      >
        {proxyGroups.map((column, i) => (
          <div key={i} className={s0.column}>
            {column.map(({ name, i: originalIndex }) => (
              <div className={s0.group} key={name} style={{ order: originalIndex }}>
                <ProxyGroup
                  name={name}
                  delay={delay}
                  apiConfig={apiConfig}
                  dispatch={dispatch}
                  proxies={proxies}
                  hideUnavailableProxies={appConfig.hideUnavailableProxies}
                  proxySortBy={appConfig.proxySortBy}
                  isOpen={Boolean(collapsibleIsOpen[`proxyGroup:${name}`])}
                  httpsLatencyTest={httpsLatencyTest}
                  proxyGroupByProvider={appConfig.proxyGroupByProvider}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    ) : (
      <div
        className={cx(s0.groupsContainer, {
          [s0.doubleColumn]: appConfig.proxiesLayout === 'double',
        })}
      >
        {providers.map((column, i) => (
          <div key={i} className={s0.column}>
            {column.map(({ item, i: originalIndex }) => (
              <div className={s0.group} key={item.name} style={{ order: originalIndex }}>
                <ProxyProvider
                  name={item.name}
                  proxies={item.proxies}
                  type={item.type}
                  vehicleType={item.vehicleType}
                  updatedAt={item.updatedAt}
                  subscriptionInfo={item.subscriptionInfo}
                  proxyMapping={proxies}
                  httpsLatencyTest={httpsLatencyTest}
                  delay={delay}
                  hideUnavailableProxies={appConfig.hideUnavailableProxies}
                  proxySortBy={appConfig.proxySortBy}
                  isOpen={Boolean(collapsibleIsOpen[`proxyProvider:${item.name}`])}
                  dispatch={dispatch}
                  apiConfig={apiConfig}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    );

  return (
    <>
      <BaseModal isOpen={isSettingsModalOpen} onRequestClose={closeSettingsModal}>
        <Settings appConfig={appConfig} />
      </BaseModal>
      <div className={s0.topBar}>
        <ContentHeader>
          <div className={s0.tabsContainer}>
            <div
              className={cx(s0.tab, { [s0.active]: activeTab === 'proxies' })}
              onClick={() => setActiveTab('proxies')}
              onKeyDown={handleTabKeyDown('proxies')}
              role="button"
              tabIndex={0}
            >
              {t('Proxies')}
              <span className={s0.tabCount}>{formatQty(groupNames.length)}</span>
            </div>
            {proxyProviders.length > 0 && (
              <div
                className={cx(s0.tab, { [s0.active]: activeTab === 'providers' })}
                onClick={() => setActiveTab('providers')}
                onKeyDown={handleTabKeyDown('providers')}
                role="button"
                tabIndex={0}
              >
                {t('proxy_provider')}
                <span className={s0.tabCount}>{formatQty(proxyProviders.length)}</span>
              </div>
            )}
          </div>
          <div style={{ flex: 1 }} />
          <div className={s0.topBarRight}>
            <div className={s0.textFilterContainer}>
              <TextFilter textAtom={proxyFilterText} placeholder={t('Search')} />
            </div>
            <Tooltip label={t('settings')}>
              <Button kind="minimal" onClick={openSettingsModal}>
                <Equalizer size={16} />
              </Button>
            </Tooltip>
          </div>
        </ContentHeader>
      </div>
      {content}
      <div style={{ height: 60 }} />
      <ProxyPageFab dispatch={dispatch} apiConfig={apiConfig} proxyProviders={proxyProviders} />
      <BaseModal isOpen={showModalClosePrevConns} onRequestClose={closeModalClosePrevConns}>
        <ClosePrevConns
          onClickPrimaryButton={() => closePrevConnsAndTheModal(apiConfig)}
          onClickSecondaryButton={closeModalClosePrevConns}
        />
      </BaseModal>
    </>
  );
}
