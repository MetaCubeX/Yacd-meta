import { formatDistance } from 'date-fns';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

import type { RuleProvider } from '~/api/rule-provider';
import { Activity, Database, FileText } from '~/components/shared/FeatherIcons';
import { RotateIcon } from '~/components/shared/RotateIcon';
import { getDateFnsLocale } from '~/misc/date-locale';
import { useUpdateRuleProviderItem } from '~/modules/rules/hooks';
import { ClashAPIConfig } from '~/types';

import s from './RuleProviderItem.module.scss';

/** 引用策略最多直接列出几个，其余折成 +N */
const MAX_USAGE_SHOWN = 3;

type Props = RuleProvider & {
  apiConfig: ClashAPIConfig;
  /** 引用了该提供商的规则所指向的策略 */
  usedBy: string[];
};

function RuleProviderItemInner({
  name,
  vehicleType,
  behavior,
  format,
  updatedAt,
  ruleCount,
  apiConfig,
  usedBy,
}: Props) {
  const { t, i18n } = useTranslation();
  const [refresh, isRefreshing] = useUpdateRuleProviderItem(name, apiConfig);
  const timeAgo = formatDistance(new Date(updatedAt), new Date(), {
    locale: getDateFnsLocale(i18n.language),
  });
  const shown = usedBy.slice(0, MAX_USAGE_SHOWN);
  const rest = usedBy.length - shown.length;

  return (
    <div className={s.item}>
      <div className={s.head}>
        <span className={s.name} title={name}>
          {name}
        </span>
        <button
          type="button"
          className={s.refreshBtn}
          onClick={refresh}
          disabled={isRefreshing}
          aria-label={t('update_rule_provider')}
          title={t('update_rule_provider')}
        >
          <RotateIcon isRotating={isRefreshing} />
        </button>
      </div>

      <div className={s.badges}>
        <span className={s.badge}>
          <Database size={11} />
          {vehicleType}
        </span>
        <span className={s.badge}>
          <Activity size={11} />
          {behavior}
        </span>
        {format ? (
          <span className={s.badge}>
            <FileText size={11} />
            {format.replace(/Rule$/, '')}
          </span>
        ) : null}
      </div>

      <div className={s.stats}>
        <span className={s.count}>{t('rule_entry_count', { count: ruleCount })}</span>
        <span className={s.dot}>·</span>
        <span>{t('updated_ago', { time: timeAgo })}</span>
      </div>

      <div className={s.usage} title={usedBy.join('\n')}>
        {usedBy.length > 0 ? (
          <>
            <span className={s.usageLabel}>{t('rule_provider_used_by')}</span>
            {shown.map((p) => (
              <span key={p} className={s.policy}>
                {p}
              </span>
            ))}
            {rest > 0 ? <span className={s.more}>+{rest}</span> : null}
          </>
        ) : (
          <span className={s.unused}>{t('rule_provider_unused')}</span>
        )}
      </div>
    </div>
  );
}

export const RuleProviderItem = React.memo(RuleProviderItemInner);
