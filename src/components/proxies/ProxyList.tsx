import cx from 'clsx';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

import { getProxyLatency } from '~/modules/proxies/utils';
import { DelayMapping, ProxiesMapping } from '~/store/types';

import { Proxy, ProxySmall } from './Proxy';
import s from './ProxyList.module.scss';

type ProxyListProps = {
  all: string[];
  proxies: ProxiesMapping;
  delay: DelayMapping;
  httpsLatencyTest: boolean;
  onTestLatency: (name: string, providerName?: string) => void;
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
  onTestLatency,
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
            proxy={proxy}
            onTestLatency={onTestLatency}
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
  onTestLatency,
  now,
  isSelectable,
  itemOnTapCallback,
}: ProxyListProps) {
  const { t } = useTranslation();
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
          {label ? (
            <div className={s.providerLabel}>
              <span>{label}</span>
              <span className={s.providerQty}>{t('node_qty', { n: names.length })}</span>
            </div>
          ) : null}
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
                  proxy={proxy}
                  onTestLatency={onTestLatency}
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
