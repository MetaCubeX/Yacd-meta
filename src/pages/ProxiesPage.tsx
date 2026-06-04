import { createSelector } from 'reselect';

import Proxies from '~/components/proxies/Proxies';
import { connect } from '~/components/StateProvider';
import {
  getAutoCloseOldConns,
  getClashAPIConfig,
  getCollapsibleIsOpen,
  getHideUnavailableProxies,
  getLatencyTestUrl,
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
  (
    proxySortBy,
    hideUnavailableProxies,
    autoCloseOldConns,
    proxiesLayout,
    proxyGroupByProvider,
  ) => ({
    proxySortBy,
    hideUnavailableProxies,
    autoCloseOldConns,
    proxiesLayout,
    proxyGroupByProvider,
  }),
);

const mapState = (state: State) => ({
  apiConfig: getClashAPIConfig(state),
  groupNames: getProxyGroupNames(state),
  proxies: getProxies(state),
  proxyProviders: getProxyProviders(state),
  delay: getDelay(state),
  latencyTestUrl: getLatencyTestUrl(state),
  collapsibleIsOpen: getCollapsibleIsOpen(state),
  showModalClosePrevConns: getShowModalClosePrevConns(state),
  appConfig: getAppConfig(state),
});

export default connect(mapState)(Proxies);
