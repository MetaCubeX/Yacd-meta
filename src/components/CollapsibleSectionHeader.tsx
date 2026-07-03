import * as React from 'react';
import { useTranslation } from 'react-i18next';

import s from './CollapsibleSectionHeader.module.scss';
import { SectionNameType } from './shared/Basic';
import { Lock } from './shared/FeatherIcons';

type Props = {
  name: string;
  type: string;
  qty?: number | string;
  toggle?: () => void;
  isOpen?: boolean;
  // URLTest/Fallback group has a manually-fixed selection
  fixed?: boolean;
};

export default function Header({ name, type, toggle, qty, fixed }: Props) {
  const { t } = useTranslation();
  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      e.preventDefault();
      if (e.key === 'Enter' || e.key === ' ') {
        toggle();
      }
    },
    [toggle]
  );
  return (
    <div
      className={s.header}
      onClick={toggle}
      style={{ cursor: 'pointer' }}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      role="button"
    >
      <div>
        <SectionNameType name={name} type={type} />
      </div>

      {fixed ? (
        <span className={s.lock} title={t('group_fixed_tip')}>
          <Lock size={13} />
        </span>
      ) : null}

      {typeof qty === 'number' ? <span className={s.qty}>{qty}</span> : null}
    </div>
  );
}
