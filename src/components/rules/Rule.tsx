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
  hitBarRatio,
  isLogicPayload,
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
  maxHits: number;
};

function Rule({ type, payload, proxy, id, size, extra, apiConfig, provider, maxHits }: Props) {
  const { t, i18n } = useTranslation();
  const { toggleRule, isPending } = useToggleRuleDisabled(apiConfig);
  const disabled = extra?.disabled ?? false;
  const entryCount = getEntryCount({ type, payload, size, provider });
  const hits = extra?.hitCount ?? 0;

  const hitTitle = extra
    ? hits > 0
      ? t('rule_hit_tip', {
          count: hits,
          time: formatDistanceToNow(new Date(extra.hitAt), {
            addSuffix: true,
            locale: getDateFnsLocale(i18n.language),
          }),
        })
      : t('rule_never_hit')
    : undefined;

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

      {extra ? (
        <span className={cx(s.hits, { [s.noHits]: hits === 0 })} title={hitTitle}>
          <span className={s.hitTrack}>
            <span
              className={s.hitBar}
              style={{ transform: `scaleX(${hitBarRatio(hits, maxHits)})` }}
            />
          </span>
          <span className={s.hitCount}>{hits > 0 ? formatCompact(hits, i18n.language) : '0'}</span>
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
      <span className={s.hits}>{t('rule_col_hits')}</span>
    </div>
  );
}
