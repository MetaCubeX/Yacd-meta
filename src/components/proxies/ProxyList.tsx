import cx from 'clsx';
import * as React from 'react';

import { getProxyLatency } from '~/modules/proxies/utils';
import { DelayMapping, DispatchFn, ProxiesMapping } from '~/store/types';
import { ClashAPIConfig } from '~/types';

import { Proxy, ProxySmall } from './Proxy';
import s from './ProxyList.module.scss';

type ProxyListProps = {
  all: string[];
  proxies: ProxiesMapping;
  delay: DelayMapping;
  httpsLatencyTest: boolean;
  apiConfig: ClashAPIConfig;
  dispatch: DispatchFn;
  now?: string;
  isSelectable?: boolean;
  itemOnTapCallback?: (x: string) => void;
  show?: boolean;
};

export function ProxyList({
  all,
  proxies,
  delay,
  httpsLatencyTest,
  apiConfig,
  dispatch,
  now,
  isSelectable,
  itemOnTapCallback,
}: ProxyListProps) {
  const proxyNames = all;

  return (
    <div className={cx(s.list, s.detail)}>
      {proxyNames.map((proxyName) => {
        const proxy = proxies[proxyName] || {
          name: proxyName,
          type: 'Http' as const,
          udp: false,
          tfo: false,
          history: [],
        };
        return (
          <Proxy
            apiConfig={apiConfig}
            dispatch={dispatch}
            proxy={proxy}
            latency={getProxyLatency(proxies, delay, proxyName)}
            httpsLatencyTest={httpsLatencyTest}
            key={proxyName}
            onClick={itemOnTapCallback}
            isSelectable={isSelectable}
            name={proxyName}
            now={proxyName === now}
          />
        );
      })}
    </div>
  );
}

export function ProxyListSummaryView({
  all,
  proxies,
  delay,
  httpsLatencyTest,
  apiConfig,
  dispatch,
  now,
  isSelectable,
  itemOnTapCallback,
}: ProxyListProps) {
  return (
    <div className={cx(s.list, s.summary)}>
      {all.map((proxyName) => {
        const proxy = proxies[proxyName] || {
          name: proxyName,
          type: 'Http' as const,
          udp: false,
          tfo: false,
          history: [],
        };
        return (
          <ProxySmall
            apiConfig={apiConfig}
            dispatch={dispatch}
            proxy={proxy}
            latency={getProxyLatency(proxies, delay, proxyName)}
            httpsLatencyTest={httpsLatencyTest}
            key={proxyName}
            onClick={itemOnTapCallback}
            isSelectable={isSelectable}
            name={proxyName}
            now={proxyName === now}
          />
        );
      })}
    </div>
  );
}

export function ProxyListGroupedByProvider({
  all,
  proxies,
  delay,
  httpsLatencyTest,
  apiConfig,
  dispatch,
  now,
  isSelectable,
  itemOnTapCallback,
}: ProxyListProps) {
  // Group proxy names by their providerName
  const groups: { label: string; names: string[] }[] = React.useMemo(() => {
    const map = new Map<string, string[]>();
    for (const proxyName of all) {
      const providerName = proxies[proxyName]?.providerName ?? '';
      if (!map.has(providerName)) map.set(providerName, []);
      map.get(providerName)!.push(proxyName);
    }
    return Array.from(map.entries()).map(([label, names]) => ({ label, names }));
  }, [all, proxies]);

  return (
    <div>
      {groups.map(({ label, names }) => (
        <div key={label} className={s.providerGroup}>
          {label ? <div className={s.providerLabel}>{label}</div> : null}
          <div className={cx(s.list, s.detail)}>
            {names.map((proxyName) => {
              const proxy = proxies[proxyName] || {
                name: proxyName,
                type: 'Http' as const,
                udp: false,
                tfo: false,
                history: [],
              };
              return (
                <Proxy
                  apiConfig={apiConfig}
                  dispatch={dispatch}
                  proxy={proxy}
                  latency={getProxyLatency(proxies, delay, proxyName)}
                  httpsLatencyTest={httpsLatencyTest}
                  key={proxyName}
                  onClick={itemOnTapCallback}
                  isSelectable={isSelectable}
                  name={proxyName}
                  now={proxyName === now}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
