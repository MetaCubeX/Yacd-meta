import * as React from 'react';
import { useTranslation } from 'react-i18next';

import { Pause, Play, Sliders, X } from '~/components/shared/FeatherIcons';
import {
  HeaderActions,
  HeaderButton,
  HeaderIconButton,
  HeaderRowBreak,
  HeaderSearch,
  headerSearchInlineClass,
  headerSelectClass,
  HeaderTab,
  HeaderTabs,
  HeaderTitle,
  PageHeader,
} from '~/components/shared/PageHeader';
import Select from '~/components/shared/Select';

import s from './ConnectionsHeader.module.scss';

export type ConnTabKey = 'active' | 'closed';

type Props = {
  activeTab: ConnTabKey;
  setActiveTab: (tab: ConnTabKey) => void;
  activeCount: number;
  closedCount: number;
  connIpSet: string[][];
  filterSourceIpStr: string;
  setFilterSourceIpStr: (value: string) => void;
  filterKeyword: string;
  setFilterKeyword: (value: string) => void;
  isRefreshPaused: boolean;
  toggleIsRefreshPaused: () => void;
  isFiltering: boolean;
  onCloseFiltered: () => void;
  onCloseAll: () => void;
  onOpenSettings: () => void;
};

export function ConnectionsHeader({
  activeTab,
  setActiveTab,
  activeCount,
  closedCount,
  connIpSet,
  filterSourceIpStr,
  setFilterSourceIpStr,
  filterKeyword,
  setFilterKeyword,
  isRefreshPaused,
  toggleIsRefreshPaused,
  isFiltering,
  onCloseFiltered,
  onCloseAll,
  onOpenSettings,
}: Props) {
  const { t } = useTranslation();

  return (
    <PageHeader>
      <HeaderTitle>{t('Connections')}</HeaderTitle>

      <HeaderTabs label={t('Connections')}>
        <HeaderTab
          active={activeTab === 'active'}
          label={t('Active')}
          count={activeCount}
          onClick={() => setActiveTab('active')}
        />
        <HeaderTab
          active={activeTab === 'closed'}
          label={t('Closed')}
          count={closedCount}
          onClick={() => setActiveTab('closed')}
        />
      </HeaderTabs>

      <Select
        options={connIpSet}
        selected={filterSourceIpStr}
        className={`${headerSelectClass} ${s.sourceSelect}`}
        aria-label={t('c_source')}
        onChange={(e) => setFilterSourceIpStr(e.target.value)}
      />

      <HeaderSearch
        className={`${headerSearchInlineClass} ${s.search}`}
        value={filterKeyword}
        onChange={setFilterKeyword}
        placeholder={t('search_conns_placeholder')}
      />

      <HeaderActions className={s.actions}>
        <HeaderButton
          variant={isRefreshPaused ? 'paused' : 'ghost'}
          icon={isRefreshPaused ? <Play size={14} /> : <Pause size={14} />}
          label={isRefreshPaused ? t('Resume Refresh') : t('Pause Refresh')}
          onClick={toggleIsRefreshPaused}
        />

        {isFiltering ? (
          <HeaderButton
            icon={
              <span className={s.btnIconBadged}>
                <X size={14} />
                <span className={s.btnBadge}>F</span>
              </span>
            }
            label={t('close_filtered')}
            title={t('close_filter_connections')}
            onClick={onCloseFiltered}
          />
        ) : null}

        <HeaderButton
          variant="danger"
          icon={<X size={14} />}
          label={t('close_all')}
          onClick={onCloseAll}
        />

        <HeaderIconButton
          icon={<Sliders size={17} />}
          label={t('conn_settings')}
          onClick={onOpenSettings}
        />
      </HeaderActions>

      {/* 窄屏下强制换行，让搜索和来源筛选独占第二行 */}
      <HeaderRowBreak className={s.rowBreak} />
    </PageHeader>
  );
}
