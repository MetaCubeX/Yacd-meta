import { formatDistance } from 'date-fns';
import * as React from 'react';

import Button from '~/components/Button';
import { Activity, Database, RefreshCw } from '~/components/shared/FeatherIcons';
import { useUpdateRuleProviderItem } from '~/modules/rules/hooks';

import s from './RuleProviderItem.module.scss';

export function RuleProviderItem({
  idx,
  name,
  vehicleType,
  behavior,
  updatedAt,
  ruleCount,
  apiConfig,
}) {
  const [onClickRefreshButton, isRefreshing] = useUpdateRuleProviderItem(name, apiConfig);
  const timeAgo = formatDistance(new Date(updatedAt), new Date());
  return (
    <div className={s.RuleProviderItem}>
      <div className={s.left}>{idx}</div>
      <div className={s.middle}>
        <div className={s.nameRow}>
          <span className={s.name}>{name}</span>
          <div className={s.badgeGroup}>
            <span className={s.badge}>
              <Database size={12} />
              {vehicleType}
            </span>
            <span className={s.badge}>
              <Activity size={12} />
              {behavior}
            </span>
          </div>
        </div>
        <div className={s.infoRow}>
          <span className={s.count}>{ruleCount} rules</span>
          <span className={s.dot}>•</span>
          <span className={s.time}>Updated {timeAgo} ago</span>
        </div>
      </div>
      <div className={s.right}>
        <Button
          kind="minimal"
          onClick={onClickRefreshButton}
          disabled={isRefreshing}
          className={s.refreshButton}
        >
          <RefreshCw size={18} className={isRefreshing ? s.rotating : ''} />
        </Button>
      </div>
    </div>
  );
}
