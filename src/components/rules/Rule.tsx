import cx from 'clsx';
import { formatDistanceToNow } from 'date-fns';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { RuleExtra } from '~/api/rules';
import { Activity, FileText, Globe, Hash, Link, Shield, Zap } from '~/components/shared/FeatherIcons';
import SwitchThemed from '~/components/SwitchThemed';
import { useToggleRuleDisabled } from '~/modules/rules/hooks';
import { ClashAPIConfig } from '~/types';

import s0 from './Rule.module.scss';

const colorMap = {
  _default: 'var(--color-focus-blue)',
  DIRECT: '#f5bc41',
  REJECT: '#cb3166',
};

function getStyleFor({ proxy }) {
  let color = colorMap._default;
  if (colorMap[proxy]) {
    color = colorMap[proxy];
  }
  return { color };
}

function getIconFor(type: string) {
  switch (type) {
    case 'Domain':
    case 'DomainSuffix':
    case 'DomainKeyword':
      return <Link size={14} />;
    case 'IPCIDR':
    case 'IPCIDR6':
      return <Hash size={14} />;
    case 'GeoSite':
    case 'GeoIP':
      return <Globe size={14} />;
    case 'REJECT':
      return <Shield size={14} />;
    case 'DIRECT':
      return <Zap size={14} />;
    default:
      return <FileText size={14} />;
  }
}

type RuleProviderLookup = {
  byName: Record<string, { ruleCount?: number }>;
};

type Props = {
  id?: number;
  type?: string;
  payload?: string;
  proxy?: string;
  size?: number;
  extra?: RuleExtra;
  apiConfig?: ClashAPIConfig;
  provider?: RuleProviderLookup;
};

function getEntryCount({
  type,
  payload,
  size,
  provider,
}: {
  type: string;
  payload: string;
  size: number;
  provider?: RuleProviderLookup;
}): number | undefined {
  if ((type === 'GeoSite' || type === 'GeoIP') && size >= 0) {
    return size;
  }
  if (type === 'RuleSet') {
    return provider?.byName?.[payload]?.ruleCount;
  }
  return undefined;
}

function Rule({ type, payload, proxy, id, size, extra, apiConfig, provider }: Props) {
  const { t } = useTranslation();
  const styleProxy = getStyleFor({ proxy });
  const { toggleRule, isPending } = useToggleRuleDisabled(apiConfig);
  const disabled = extra?.disabled ?? false;
  const entryCount = getEntryCount({ type, payload, size, provider });

  const hitTitle = extra
    ? extra.hitCount > 0
      ? t('rule_hit_tip', {
          count: extra.hitCount,
          time: formatDistanceToNow(new Date(extra.hitAt), { addSuffix: true }),
        })
      : t('rule_never_hit')
    : undefined;

  return (
    <div className={cx(s0.rule, { [s0.disabled]: disabled })}>
      <div className={s0.left}>{id}</div>
      <div className={s0.right}>
        <div className={s0.payloadRow}>
          <div className={s0.payload}>{payload}</div>
          {typeof entryCount === 'number' && (
            <div className={s0.size}>{t('rule_entry_count', { count: entryCount })}</div>
          )}
        </div>
        <div className={s0.metaRow}>
          <div className={s0.typeTag}>
            {getIconFor(type)}
            <span>{type}</span>
          </div>
          <div className={s0.proxyTag} style={styleProxy}>
            {proxy}
          </div>
          {extra && (
            <div className={s0.hitInfo} title={hitTitle}>
              <Activity size={12} />
              <span>{extra.hitCount}</span>
            </div>
          )}
          <div className={s0.spacer} />
          {extra && (
            <div
              className={cx(s0.wrapSwitch, { [s0.pending]: isPending })}
              title={disabled ? t('rule_enable') : t('rule_disable')}
            >
              <SwitchThemed
                name={`rule-${id}`}
                checked={!disabled}
                onChange={(checked: boolean) => toggleRule(id, !checked)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Rule;
