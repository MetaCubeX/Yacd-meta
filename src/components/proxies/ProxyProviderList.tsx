import * as React from 'react';

import { ProxyProvider } from '~/components/proxies/ProxyProvider';
import { DelayMapping, DispatchFn, FormattedProxyProvider, ProxiesMapping } from '~/store/types';
import { ClashAPIConfig } from '~/types';

export function ProxyProviderList({
  items,
  delay,
  proxies,
  httpsLatencyTest,
  hideUnavailableProxies,
  proxySortBy,
  dispatch,
  apiConfig,
  collapsibleIsOpen,
}: {
  items: FormattedProxyProvider[];
  delay: DelayMapping;
  proxies: ProxiesMapping;
  httpsLatencyTest: boolean;
  hideUnavailableProxies: boolean;
  proxySortBy: string;
  dispatch: DispatchFn;
  apiConfig: ClashAPIConfig;
  collapsibleIsOpen: Record<string, boolean>;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      {items.map((item) => (
        <ProxyProvider
          key={item.name}
          name={item.name}
          proxies={item.proxies}
          type={item.type}
          vehicleType={item.vehicleType}
          updatedAt={item.updatedAt}
          subscriptionInfo={item.subscriptionInfo}
          proxyMapping={proxies}
          httpsLatencyTest={httpsLatencyTest}
          delay={delay}
          hideUnavailableProxies={hideUnavailableProxies}
          proxySortBy={proxySortBy}
          dispatch={dispatch}
          apiConfig={apiConfig}
          isOpen={Boolean(collapsibleIsOpen[`proxyProvider:${item.name}`])}
        />
      ))}
    </div>
  );
}
