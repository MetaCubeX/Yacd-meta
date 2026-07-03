import { useSuspenseQuery } from '@tanstack/react-query';
import cx from 'clsx';
import * as React from 'react';


import { fetchVersion } from '~/api/version';
import { ChevronDown, Zap } from '~/components/shared/FeatherIcons';
import { useFilteredAndSorted } from '~/modules/proxies/hooks';
import { getProxyLatency } from '~/modules/proxies/utils';
import { switchProxy } from '~/store/proxies';
import { DelayMapping, DispatchFn, ProxiesMapping, ProxyItem } from '~/store/types';
import { ClashAPIConfig } from '~/types';

import Button from '../Button';
import Collapsible from '../Collapsible';
import CollapsibleSectionHeader from '../CollapsibleSectionHeader';
import { useStoreActions } from '../StateProvider';

import s0 from './ProxyGroup.module.scss';
import { ProxyList, ProxyListGroupedByProvider, ProxyListSummaryView } from './ProxyList';

const { memo, useCallback, useLayoutEffect, useMemo, useRef, useState } = React;

function buildNowChain(proxies: ProxiesMapping, groupName: string): string | null {
  const group = proxies[groupName] as ProxyItem & { now?: string };
  if (!group?.now) return null;

  const parts: string[] = [group.now];
  let current = proxies[group.now] as ProxyItem & { now?: string };
  let depth = 0;

  while (current?.now && depth < 3) {
    const next = proxies[current.now];
    if (!next) break;
    parts.push(current.now);
    current = next as ProxyItem & { now?: string };
    depth++;
  }

  return parts.join(' ⊙ ');
}

function countAvailableProxies(names: string[], delay: DelayMapping): number {
  return names.filter((name) => {
    const d = delay[name];
    return d && typeof d.number === 'number' && d.number > 0;
  }).length;
}

function getLatencyColor(number: number | undefined, httpsTest: boolean): string {
  if (!number || number === 0) return '#909399';
  const good = httpsTest ? 800 : 200;
  const normal = httpsTest ? 1500 : 500;
  if (number < good) return '#67c23a';
  if (number < normal) return '#d4b75c';
  return '#e67f3c';
}

function ZapWrapper() {
  return (
    <div className={s0.zapWrapper}>
      <Zap size={16} />
    </div>
  );
}

const ProxyAvailabilityBar = memo(function ProxyAvailabilityBar({
  all,
  delay,
}: {
  all: string[];
  delay: DelayMapping;
}) {
  const total = all.length;
  const available = useMemo(() => countAvailableProxies(all, delay), [all, delay]);
  const pct = total > 0 ? Math.round((available / total) * 100) : 0;

  return (
    <div className={s0.availBar}>
      <div className={s0.availBarTrack}>
        <div className={s0.availBarFill} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
});

type Props = {
  name: string;
  delay: DelayMapping;
  hideUnavailableProxies: boolean;
  proxySortBy: string;
  proxies: ProxiesMapping;
  isOpen: boolean;
  httpsLatencyTest: boolean;
  apiConfig: ClashAPIConfig;
  dispatch: DispatchFn;
  proxyGroupByProvider?: boolean;
};

export const ProxyGroup = memo(function ProxyGroup({
  name,
  delay,
  hideUnavailableProxies,
  proxySortBy,
  proxies,
  isOpen,
  httpsLatencyTest,
  apiConfig,
  dispatch,
  proxyGroupByProvider = false,
}: Props) {
  const group = proxies[name] as ProxyItem & { all?: string[]; now?: string; fixed?: string };
  const { all: allItems = [], type, now, fixed } = group || {};
  const all = useFilteredAndSorted(allItems, delay, hideUnavailableProxies, proxySortBy, proxies);

  const nowChain = useMemo(() => buildNowChain(proxies, name), [proxies, name]);
  const nowLatency = useMemo(
    () => (now ? getProxyLatency(proxies, delay, now) : undefined),
    [proxies, delay, now],
  );
  const availableCount = useMemo(() => countAvailableProxies(allItems, delay), [allItems, delay]);
  const qtyLabel = `${availableCount}/${allItems.length}`;

  const { data: version } = useSuspenseQuery({
    queryKey: ['/version', apiConfig],
    queryFn: () => fetchVersion('/version', apiConfig),
  });

  const isSelectable = useMemo(
    () => ['Selector', version.meta && 'Fallback', version.meta && 'URLTest'].includes(type),
    [type, version.meta],
  );

  const {
    app: { updateCollapsibleIsOpen },
    proxies: { requestDelayForGroup },
  } = useStoreActions();

  const toggle = useCallback(() => {
    updateCollapsibleIsOpen('proxyGroup', name, !isOpen);
  }, [isOpen, updateCollapsibleIsOpen, name]);

  const itemOnTapCallback = useCallback(
    (proxyName) => {
      if (!isSelectable) return;
      dispatch(switchProxy(apiConfig, name, proxyName));
    },
    [apiConfig, dispatch, name, isSelectable],
  );
  const [isTestingLatency, setIsTestingLatency] = useState(false);

  // measure collapsed container to decide dots vs bar
  const summaryContainerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  useLayoutEffect(() => {
    const el = summaryContainerRef.current;
    if (!el) return;
    // sync read before first paint to avoid flash
    const w = el.offsetWidth;
    if (w > 0) setContainerWidth(w);
    const ro = new ResizeObserver((entries) => {
      setContainerWidth(entries[0].contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // dot slot = 15px width + 10px gap; padding-left:10px eats into available space
  // n items fit when 15 + (n-1)*25 <= containerWidth - 10  →  n <= containerWidth/25
  const dotsPerRow = containerWidth > 0 ? Math.floor(containerWidth / 25) : Infinity;
  const showBar = all.length > dotsPerRow;
  const testLatency = useCallback(async () => {
    setIsTestingLatency(true);
    try {
      await requestDelayForGroup(apiConfig, name, version.meta === true, all);
    } catch (err) {}
    setIsTestingLatency(false);
  }, [all, apiConfig, name, version.meta, requestDelayForGroup]);

  return (
    <div className={s0.group}>
      <div className={s0.groupHeader}>
        <CollapsibleSectionHeader
          name={name}
          type={type}
          toggle={toggle}
          qty={qtyLabel}
          fixed={!!fixed}
        />
        <div className={s0.btnGroup}>
          <Button
            kind="minimal"
            onClick={toggle}
            className={s0.btn}
            title="Toggle collapsible section"
          >
            <span className={cx(s0.arrow, { [s0.isOpen]: isOpen })}>
              <ChevronDown size={20} />
            </span>
          </Button>
          <Button
            title="Test latency"
            kind="minimal"
            onClick={testLatency}
            isLoading={isTestingLatency}
          >
            <ZapWrapper />
          </Button>
        </div>
      </div>
      <Collapsible isOpen={isOpen}>
        {proxyGroupByProvider ? (
          <ProxyListGroupedByProvider
            apiConfig={apiConfig}
            all={all}
            delay={delay}
            dispatch={dispatch}
            httpsLatencyTest={httpsLatencyTest}
            now={now}
            isSelectable={isSelectable}
            itemOnTapCallback={itemOnTapCallback}
            proxies={proxies}
          />
        ) : (
          <ProxyList
            apiConfig={apiConfig}
            all={all}
            delay={delay}
            dispatch={dispatch}
            httpsLatencyTest={httpsLatencyTest}
            now={now}
            isSelectable={isSelectable}
            itemOnTapCallback={itemOnTapCallback}
            proxies={proxies}
          />
        )}
      </Collapsible>
      <Collapsible isOpen={!isOpen}>
        {nowChain && (
          <div className={s0.nowRow}>
            <span className={s0.nowName}>⊙ {nowChain}</span>
            {nowLatency?.number ? (
              <span
                className={s0.nowLatency}
                style={{ color: getLatencyColor(nowLatency.number, httpsLatencyTest) }}
              >
                {nowLatency.number} ms
              </span>
            ) : null}
          </div>
        )}
        <div ref={summaryContainerRef}>
          {showBar ? (
            <ProxyAvailabilityBar all={allItems} delay={delay} />
          ) : (
            <ProxyListSummaryView
              apiConfig={apiConfig}
              all={all}
              delay={delay}
              dispatch={dispatch}
              httpsLatencyTest={httpsLatencyTest}
              now={now}
              isSelectable={isSelectable}
              itemOnTapCallback={itemOnTapCallback}
              proxies={proxies}
            />
          )}
        </div>
      </Collapsible>
    </div>
  );
});
