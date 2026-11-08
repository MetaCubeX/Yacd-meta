import cx from 'clsx';
import { formatDistanceToNow } from 'date-fns';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

import type { RuleExtra } from '~/api/rules';
import { FileText, Globe, Hash, Link, Shield, Zap } from '~/components/shared/FeatherIcons';
import SwitchThemed from '~/components/shared/SwitchThemed';
import { getDateFnsLocale } from '~/misc/date-locale';
import { useToggleRuleDisabled } from '~/modules/rules/hooks';
import {
  isLogicPayload,
  ruleFunnel,
  tokenizeLogicPayload,
  type RuleProviderIndex,
} from '~/modules/rules/utils';
import { ClashAPIConfig } from '~/types';

import s from './Rule.module.scss';

const proxyColor: Record<string, string> = {
  DIRECT: '#f5bc41',
  REJECT: '#cb3166',
};

function getIconFor(type: string) {
  switch (type) {
    case 'Domain':
    case 'DomainSuffix':
    case 'DomainKeyword':
      return <Link size={12} />;
    case 'IPCIDR':
    case 'IPCIDR6':
      return <Hash size={12} />;
    case 'GeoSite':
    case 'GeoIP':
      return <Globe size={12} />;
    case 'REJECT':
      return <Shield size={12} />;
    case 'DIRECT':
      return <Zap size={12} />;
    default:
      return <FileText size={12} />;
  }
}

const compactFormatters = new Map<string, Intl.NumberFormat>();
function formatCompact(n: number, language: string): string {
  let f = compactFormatters.get(language);
  if (!f) {
    f = new Intl.NumberFormat(language, { notation: 'compact', maximumFractionDigits: 1 });
    compactFormatters.set(language, f);
  }
  return f.format(n);
}

/** GeoSite/GeoIP 的条目数后端直接给，RuleSet 的要去提供商表里查 */
function getEntryCount({
  type,
  payload,
  size,
  provider,
}: {
  type: string;
  payload: string;
  size: number;
  provider?: RuleProviderIndex;
}): number | undefined {
  if ((type === 'GeoSite' || type === 'GeoIP') && size >= 0) {
    return size;
  }
  if (type === 'RuleSet') {
    return provider?.byName?.[payload]?.ruleCount;
  }
  return undefined;
}

function formatShare(ratio: number): string {
  if (ratio <= 0) return '0%';
  const pct = ratio * 100;
  if (pct < 0.1) return '<0.1%';
  return `${pct < 10 ? pct.toFixed(1) : Math.round(pct)}%`;
}

/**
 * 漏斗的一级：浅色段是轮到本条检查的次数，深色段是其中命中的部分，贴在浅色段右端。
 * 各行左对齐、同一刻度，下一行的浅色段因此正好收到本行深色段的起点，逐行连成台阶。
 */
function FunnelBar({ reachedRatio, hitRatio }: { reachedRatio: number; hitRatio: number }) {
  const hitInReached = reachedRatio > 0 ? hitRatio / reachedRatio : 0;
  return (
    <span className={s.funnelTrack}>
      <span className={s.funnelReached} style={{ width: `${reachedRatio * 100}%` }}>
        {hitRatio > 0 ? (
          <span className={s.funnelHit} style={{ width: `${hitInReached * 100}%` }} />
        ) : null}
      </span>
    </span>
  );
}

function Payload({ payload }: { payload: string }) {
  if (!isLogicPayload(payload)) return <>{payload}</>;
  return (
    <>
      {tokenizeLogicPayload(payload).map((tok, i) => (
        <span key={i} className={s[`tok_${tok.kind}`]}>
          {tok.text}
        </span>
      ))}
    </>
  );
}

type Props = {
  id: number;
  type: string;
  payload: string;
  proxy: string;
  size: number;
  extra?: RuleExtra;
  apiConfig: ClashAPIConfig;
  provider?: RuleProviderIndex;
  totalEvals: number;
};

function Rule({ type, payload, proxy, id, size, extra, apiConfig, provider, totalEvals }: Props) {
  const { t, i18n } = useTranslation();
  const { toggleRule, isPending } = useToggleRuleDisabled(apiConfig);
  const disabled = extra?.disabled ?? false;
  const entryCount = getEntryCount({ type, payload, size, provider });
  const funnel = extra ? ruleFunnel(extra, totalEvals) : null;

  let funnelTitle: string | undefined;
  if (extra && funnel) {
    const lines = [
      t('rule_funnel_tip', {
        reached: funnel.reached.toLocaleString(i18n.language),
        hits: funnel.hits.toLocaleString(i18n.language),
        share: formatShare(funnel.hitRatio),
      }),
      funnel.hits > 0
        ? t('rule_last_hit', {
            time: formatDistanceToNow(new Date(extra.hitAt), {
              addSuffix: true,
              locale: getDateFnsLocale(i18n.language),
            }),
          })
        : t('rule_never_hit'),
    ];
    if (disabled) lines.push(t('rule_counts_frozen'));
    funnelTitle = lines.join('\n');
  }

  return (
    <div className={cx(s.rule, { [s.disabled]: disabled })}>
      {extra ? (
        <div
          className={cx(s.switch, { [s.pending]: isPending })}
          title={disabled ? t('rule_enable') : t('rule_disable')}
        >
          <SwitchThemed
            size="mini"
            name={`rule-${id}`}
            checked={!disabled}
            onChange={(checked: boolean) => toggleRule(id, !checked)}
          />
        </div>
      ) : null}

      <div className={s.index}>{id}</div>

      <span className={s.typeTag}>
        {getIconFor(type)}
        <span>{type}</span>
      </span>

      <div className={s.payloadCell}>
        <div className={s.payload} title={payload}>
          <Payload payload={payload} />
        </div>
        {typeof entryCount === 'number' ? (
          <div className={s.entryCount}>{t('rule_entry_count', { count: entryCount })}</div>
        ) : null}
      </div>

      <span
        className={s.proxy}
        title={proxy}
        style={{ color: proxyColor[proxy] ?? 'var(--color-focus-blue)' }}
      >
        {proxy}
      </span>

      {funnel ? (
        <span className={cx(s.hits, { [s.noHits]: funnel.hits === 0 })} title={funnelTitle}>
          <FunnelBar reachedRatio={funnel.reachedRatio} hitRatio={funnel.hitRatio} />
          <span className={s.hitCount}>{formatCompact(funnel.hits, i18n.language)}</span>
          <span className={s.hitShare}>{formatShare(funnel.hitRatio)}</span>
        </span>
      ) : null}
    </div>
  );
}

// 上千行的虚拟列表，滚动时不该因为父组件重渲染而整屏重算
export default React.memo(Rule);

/** 宽屏下规则列表的表头，列宽和 .rule 共用同一套网格 */
export function RuleListHeader() {
  const { t } = useTranslation();
  return (
    <div className={cx(s.rule, s.header)}>
      <span className={s.switch} />
      <span className={s.index}>#</span>
      <span className={s.headType}>{t('rule_col_type')}</span>
      <span className={s.payloadCell}>{t('rule_col_payload')}</span>
      <span className={s.headProxy}>{t('rule_col_policy')}</span>
      <span className={cx(s.hits, s.headHits)} title={t('rule_funnel_legend')}>
        {t('rule_col_hits')}
      </span>
    </div>
  );
}
