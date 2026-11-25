import cx from 'clsx';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

import { Grid, Layers, Server } from '~/components/shared/FeatherIcons';
import type { GroupKindFilter as Filter } from '~/modules/proxies/hooks';

import s from './GroupKindFilter.module.scss';

const OPTIONS: { value: Filter; labelKey: string; Icon: typeof Grid }[] = [
  { value: 'all', labelKey: 'group_kind_all', Icon: Grid },
  { value: 'policy', labelKey: 'policy_groups', Icon: Layers },
  { value: 'node', labelKey: 'node_groups', Icon: Server },
];

type Props = {
  value: Filter;
  onChange: (value: Filter) => void;
  counts: Record<Filter, number>;
};

export function GroupKindFilter({ value, onChange, counts }: Props) {
  const { t } = useTranslation();
  return (
    <div className={s.bar} role="radiogroup" aria-label={t('proxy_groups')}>
      {OPTIONS.map(({ value: v, labelKey, Icon }) => {
        const selected = v === value;
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={selected}
            className={cx(s.option, { [s.selected]: selected })}
            onClick={() => onChange(v)}
          >
            <Icon size={14} aria-hidden />
            {t(labelKey)}
            <span className={s.count}>{counts[v]}</span>
          </button>
        );
      })}
    </div>
  );
}
