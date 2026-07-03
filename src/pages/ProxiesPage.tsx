import { createSelector } from 'reselect';

import Proxies from '~/components/proxies/Proxies';
import { connect } from '~/components/StateProvider';
import {
  getAutoCloseOldConns,
  getClashAPIConfig,
  getCollapsibleIsOpen,
  getHideUnavailableProxies,
  getLatencyTestUrl,
  getLatencyTestTimeout,
  getLatencyTestExpectedStatus,
  getPreferBackendLatencyTestUrl,
  getProviderHealthcheckTimeout,
  getProxiesLayout,
  getProxySortBy,
  getProxyGroupByProvider,
} from '~/store/app';
import {
  getDelay,
  getProxies,
  getProxyGroupNames,
  getProxyProviders,
  getShowModalClosePrevConns,
} from '~/store/proxies';
import { State } from '~/store/types';

const getAppConfig = createSelector(
  getProxySortBy,
  getHideUnavailableProxies,
  getAutoCloseOldConns,
  getProxiesLayout,
  getProxyGroupByProvider,
  getLatencyTestUrl,
  getLatencyTestTimeout,
  getLatencyTestExpectedStatus,
  getPreferBackendLatencyTestUrl,
  getProviderHealthcheckTimeout,
  (
    proxySortBy,
    hideUnavailableProxies,
    autoCloseOldConns,
    proxiesLayout,
    proxyGroupByProvider,
    latencyTestUrl,
    latencyTestTimeout,
    latencyTestExpectedStatus,
    preferBackendLatencyTestUrl,
    providerHealthcheckTimeout,
  ) => ({
    proxySortBy,
    hideUnavailableProxies,
    autoCloseOldConns,
    proxiesLayout,
    proxyGroupByProvider,
    latencyTestUrl,
    latencyTestTimeout,
    latencyTestExpectedStatus,
    preferBackendLatencyTestUrl,
    providerHealthcheckTimeout,
  }),
);

const mapState = (state: State) => ({
  apiConfig: getClashAPIConfig(state),
  groupNames: getProxyGroupNames(state),
  proxies: getProxies(state),
  proxyProviders: getProxyProviders(state),
  delay: getDelay(state),
  collapsibleIsOpen: getCollapsibleIsOpen(state),
  showModalClosePrevConns: getShowModalClosePrevConns(state),
  appConfig: getAppConfig(state),
});

export default connect(mapState)(Proxies);
