import { Tooltip } from '@reach/tooltip';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

import Button from '~/components/Button';
import ContentHeader from '~/components/ContentHeader';
import { ClosePrevConns } from '~/components/proxies/ClosePrevConns';
import { ProxyGroup } from '~/components/proxies/ProxyGroup';
import { ProxyPageFab } from '~/components/proxies/ProxyPageFab';
import { ProxyProviderList } from '~/components/proxies/ProxyProviderList';
import Settings from '~/components/proxies/Settings';
import BaseModal from '~/components/shared/BaseModal';
import { TextFilter } from '~/components/shared/TextFitler';
import { connect, useStoreActions } from '~/components/StateProvider';
import Equalizer from '~/components/svg/Equalizer';
import { getClashAPIConfig } from '~/store/app';
import {
  fetchProxies,
  getDelay,
  getProxyGroupNames,
  getProxyProviders,
  getShowModalClosePrevConns,
  proxyFilterText,
} from '~/store/proxies';
import type { State } from '~/store/types';

import s0 from './Proxies.module.scss';

const { useState, useEffect, useCallback, useRef } = React;

function Proxies({
  dispatch,
  groupNames,
  delay,
  proxyProviders,
  apiConfig,
  showModalClosePrevConns,
}) {
  const refFetchedTimestamp = useRef<{ startAt?: number; completeAt?: number }>({});

  const fetchProxiesHooked = useCallback(() => {
    refFetchedTimestamp.current.startAt = Date.now();
    dispatch(fetchProxies(apiConfig)).then(() => {
      refFetchedTimestamp.current.completeAt = Date.now();
    });
  }, [apiConfig, dispatch]);
  useEffect(() => {
    // fetch it now
    fetchProxiesHooked();

    // arm a window on focus listener to refresh it
    const fn = () => {
      if (
        refFetchedTimestamp.current.startAt &&
        Date.now() - refFetchedTimestamp.current.startAt > 3e4 // 30s
      ) {
        fetchProxiesHooked();
      }
    };
    window.addEventListener('focus', fn, false);
    return () => window.removeEventListener('focus', fn, false);
  }, [fetchProxiesHooked]);

  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const closeSettingsModal = useCallback(() => {
    setIsSettingsModalOpen(false);
  }, []);

  const {
    proxies: { closeModalClosePrevConns, closePrevConnsAndTheModal },
  } = useStoreActions();

  const { t } = useTranslation();

  return (
    <>
      <BaseModal isOpen={isSettingsModalOpen} onRequestClose={closeSettingsModal}>
        <Settings />
      </BaseModal>
      <div className={s0.topBar}>
        <ContentHeader title={t('Proxies')} />
        <div className={s0.topBarRight}>
          <div className={s0.textFilterContainer}>
            <TextFilter textAtom={proxyFilterText} placeholder={t('Search')} />
          </div>
          <Tooltip label={t('settings')}>
            <Button kind="minimal" onClick={() => setIsSettingsModalOpen(true)}>
              <Equalizer size={16} />
            </Button>
          </Tooltip>
        </div>
      </div>
      <div>
        {groupNames.map((groupName: string) => {
          return (
            <div className={s0.group} key={groupName}>
              <ProxyGroup
                name={groupName}
                delay={delay}
                apiConfig={apiConfig}
                dispatch={dispatch}
              />
            </div>
          );
        })}
      </div>
      <ProxyProviderList items={proxyProviders} />
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

const mapState = (s: State) => ({
  apiConfig: getClashAPIConfig(s),
  groupNames: getProxyGroupNames(s),
  proxyProviders: getProxyProviders(s),
  delay: getDelay(s),
  showModalClosePrevConns: getShowModalClosePrevConns(s),
});

export default connect(mapState)(Proxies);
