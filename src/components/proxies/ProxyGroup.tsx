import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { LuPin, LuPinOff } from 'react-icons/lu';

import Collapsible from '~/components/shared/Collapsible';
import { useVersion } from '~/hooks/useVersion';
import {
  useFilterAwareCollapse,
  useFilteredAndSorted,
  useFilterSegments,
  useResumeAutomaticSelection,
  useSwitchProxy,
  useTestGroupLatency,
  useTestProxyLatency,
} from '~/modules/proxies/hooks';
import { getProxyLatency, matchesFilter, ProxiesAppConfig } from '~/modules/proxies/utils';
import { useStoreActions } from '~/store/StateProvider';
import { DelayMapping, ProxiesMapping, ProxyItem } from '~/store/types';
import { ClashAPIConfig } from '~/types';

import { getLatencyColor, ProxyCard, ProxyCardHeader, ProxyCardStatusRow } from './ProxyCard';
import s0 from './ProxyCard.module.scss';
import { ProxyList, ProxyListGroupedByProvider, ProxyListSummaryView } from './ProxyList';

const { memo, useCallback, useMemo } = React;

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

  return parts.join(' › ');
}

type Props = {
  name: string;
  delay: DelayMapping;
  proxies: ProxiesMapping;
  isOpen: boolean;
  httpsLatencyTest: boolean;
  apiConfig: ClashAPIConfig;
  appConfig: ProxiesAppConfig;
};

export const ProxyGroup = memo(function ProxyGroup({
  name,
  delay,
  proxies,
  isOpen,
  httpsLatencyTest,
  apiConfig,
  appConfig,
}: Props) {
  const { t } = useTranslation();
  const group = proxies[name] as ProxyItem & { all?: string[]; now?: string; fixed?: string };
  const { all: allItems = [], type, now, fixed } = group || {};
  // 组名本身命中搜索时，整组节点原样展示，不再逐个过滤
  const filterSegments = useFilterSegments();
  const nameMatched = matchesFilter(name, filterSegments);
  const all = useFilteredAndSorted(
    allItems,
    delay,
    appConfig.hideUnavailableProxies,
    appConfig.proxySortBy,
    proxies,
    nameMatched,
  );

  const nowChain = useMemo(() => buildNowChain(proxies, name), [proxies, name]);
  const nowLatency = useMemo(
    () => (now ? getProxyLatency(proxies, delay, now) : undefined),
    [proxies, delay, now],
  );
  const nowLatencyColor = getLatencyColor(nowLatency?.number, httpsLatencyTest);

  const version = useVersion(apiConfig);

  const isSelectable = useMemo(
    () => ['Selector', version.meta && 'Fallback', version.meta && 'URLTest'].includes(type),
    [type, version.meta],
  );

  const {
    app: { updateCollapsibleIsOpen },
  } = useStoreActions();

  const onToggle = useCallback(
    (next: boolean) => updateCollapsibleIsOpen('proxyGroup', name, next),
    [updateCollapsibleIsOpen, name],
  );
  const [effectiveIsOpen, toggle] = useFilterAwareCollapse({ isOpen, nameMatched, onToggle });

  const switchProxy = useSwitchProxy(apiConfig, appConfig.autoCloseOldConns);
  const [resumeAutomaticSelection, isResuming] = useResumeAutomaticSelection(
    apiConfig,
    appConfig.autoCloseOldConns,
  );
  const canResumeAutomaticSelection =
    version.meta && !version.premium && Boolean(fixed) && ['URLTest', 'Fallback'].includes(type);
  const itemOnTapCallback = useCallback(
    (proxyName: string) => {
      if (!isSelectable || isResuming) return;
      switchProxy(name, proxyName);
    },
    [switchProxy, name, isSelectable, isResuming],
  );

  const [testGroup, isTestingLatency] = useTestGroupLatency(apiConfig, appConfig);
  const isResumeBlocked = isResuming || isTestingLatency;
  const testLatency = useCallback(
    () => testGroup({ groupName: name, isMeta: version.meta === true, memberNames: all }),
    [testGroup, name, version.meta, all],
  );

  const onTestLatency = useTestProxyLatency(apiConfig, appConfig);

  const listProps = {
    all,
    delay,
    httpsLatencyTest,
    now,
    isSelectable: isSelectable && !isResuming,
    itemOnTapCallback,
    onTestLatency,
    proxies,
  };

  return (
    <ProxyCard>
      <ProxyCardHeader
        name={name}
        type={type}
        isOpen={effectiveIsOpen}
        toggle={toggle}
        latency={nowLatency?.number}
        latencyColor={nowLatencyColor}
        onTest={testLatency}
        isTesting={isTestingLatency}
        badges={
          canResumeAutomaticSelection ? (
            // The pin sits inside the header's click-to-collapse row, so both click and key
            // events must stop here. aria-disabled instead of disabled: a click on a disabled
            // button is not guaranteed to stay off the header across browsers.
            <button
              type="button"
              className={s0.fixedPin}
              title={t('group_fixed_resume_tip', { name: fixed })}
              aria-label={t('group_fixed_resume_tip', { name: fixed })}
              aria-disabled={isResumeBlocked}
              aria-busy={isResuming}
              onClick={(event) => {
                event.stopPropagation();
                if (!isResumeBlocked) resumeAutomaticSelection(name);
              }}
              onKeyDown={(event) => event.stopPropagation()}
            >
              <LuPin className={s0.pinIcon} aria-hidden />
              <LuPinOff className={s0.pinOffIcon} aria-hidden />
            </button>
          ) : fixed ? (
            <span className={s0.fixedBadge} title={t('group_fixed_tip')}>
              {t('group_fixed')}
            </span>
          ) : null
        }
      />

      <ProxyCardStatusRow
        nowName={nowChain}
        nowColor={nowLatencyColor}
        itemCount={all.length}
        allItems={allItems}
        delay={delay}
        renderDots={() => <ProxyListSummaryView {...listProps} />}
      />

      <Collapsible isOpen={effectiveIsOpen}>
        {appConfig.proxyGroupByProvider ? (
          <ProxyListGroupedByProvider {...listProps} />
        ) : (
          <ProxyList {...listProps} />
        )}
      </Collapsible>
    </ProxyCard>
  );
});
