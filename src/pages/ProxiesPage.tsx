import { createSelector } from 'reselect';

import Proxies from '~/components/proxies/Proxies';
import {
  getAutoCloseOldConns,
  getClashAPIConfig,
  getCollapsibleIsOpen,
  getHideUnavailableProxies,
  getLatencyTestExpectedStatus,
  getLatencyTestTimeout,
  getLatencyTestUrl,
  getPreferBackendLatencyTestUrl,
  getProviderHealthcheckTimeout,
  getProxiesLayout,
  getProxyGroupByProvider,
  getProxySortBy,
} from '~/store/app';
import { connect } from '~/store/StateProvider';
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

// 代理数据本身走 TanStack Query（modules/proxies/hooks），这里只映射旧 store 里
// 那部分持久化的 UI 偏好
const mapState = (state: State) => ({
  apiConfig: getClashAPIConfig(state),
  collapsibleIsOpen: getCollapsibleIsOpen(state),
  appConfig: getAppConfig(state),
});

export default connect(mapState)(Proxies);
