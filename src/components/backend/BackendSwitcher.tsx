import cx from 'clsx';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { LuCheck, LuChevronsUpDown, LuSettings2 } from 'react-icons/lu';
import { Link } from 'react-router-dom';

import { Popover } from '~/components/shared/Popover';
import { useBackendReachability } from '~/modules/backend/hooks';
import type { ConnectionTestResult } from '~/modules/backend/utils';
import type { ClashAPIConfig } from '~/types';

import s from './BackendSwitcher.module.scss';

const { useCallback, useState } = React;

type Props = {
  apiConfigs: ClashAPIConfig[];
  selectedIndex: number;
  /** Result of GET /version against the backend in use. */
  status: 'checking' | 'connected' | 'unreachable';
  /** Called only for a backend other than the one in use. */
  onSelect: (config: ClashAPIConfig) => void;
};

const statusClass = { checking: s.pending, connected: s.ok, unreachable: s.fail };

/** BackendSwitcher is the sidebar control that lists saved backends and switches between them. */
export function BackendSwitcher({ apiConfigs, selectedIndex, status, onSelect }: Props) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);
  const results = useBackendReachability(apiConfigs, isOpen);
  const current = apiConfigs[selectedIndex];

  return (
    <Popover
      isOpen={isOpen}
      onClose={close}
      align="left"
      placement="top"
      className={s.anchor}
      label={t('switch_backend')}
      trigger={
        <button
          type="button"
          className={cx(s.trigger, { [s.open]: isOpen })}
          title={current?.baseURL}
          aria-label={t('switch_backend')}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          onClick={toggle}
        >
          <span className={cx(s.dot, statusClass[status])} />
          <span className={s.host}>{current ? displayHost(current.baseURL) : ''}</span>
          <LuChevronsUpDown className={s.chevron} />
        </button>
      }
    >
      <div className={s.menu}>
        <div className={s.heading}>{t('switch_backend')}</div>
        <ul className={s.list}>
          {apiConfigs.map((config, idx) => {
            const isSelected = idx === selectedIndex;
            const result = results[idx];
            return (
              <li key={config.baseURL + config.secret}>
                <button
                  type="button"
                  className={cx(s.item, { [s.selected]: isSelected })}
                  title={config.baseURL}
                  aria-current={isSelected ? 'true' : undefined}
                  onClick={() => (isSelected ? close() : onSelect(config))}
                >
                  <span className={cx(s.dot, statusDotClass(result))} />
                  <span className={s.itemBody}>
                    <span className={s.itemHost}>{displayHost(config.baseURL)}</span>
                    <span
                      className={cx(s.itemStatus, { [s.itemStatusFail]: result?.ok === false })}
                    >
                      {statusText(result, t)}
                    </span>
                  </span>
                  {isSelected ? <LuCheck className={s.check} /> : null}
                </button>
              </li>
            );
          })}
        </ul>
        <div className={s.footer}>
          <Link to="/backend" className={s.item} onClick={close}>
            <LuSettings2 className={s.manageIcon} />
            {t('manage_backends')}
          </Link>
        </div>
      </div>
    </Popover>
  );
}

// 侧边栏只有 180px 宽，协议前缀占地方又几乎不提供信息，完整地址放在 title 里
function displayHost(baseURL: string) {
  return baseURL.replace(/^https?:\/\//, '');
}

function statusDotClass(result: ConnectionTestResult | undefined) {
  if (!result) return s.pending;
  return result.ok ? s.ok : s.fail;
}

function statusText(result: ConnectionTestResult | undefined, t: (key: string) => string) {
  if (!result) return t('backend_checking');
  if (result.ok) return result.version || t('backend_test_ok');
  switch (result.reason) {
    case 'unreachable':
      return t('backend_test_unreachable');
    case 'not_clash':
      return t('backend_test_not_clash');
    case 'http':
      return result.message;
  }
}
