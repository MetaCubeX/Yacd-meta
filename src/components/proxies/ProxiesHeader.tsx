import * as React from 'react';
import { useTranslation } from 'react-i18next';

import { ChevronDown, ChevronUp, Sliders, Zap } from '~/components/shared/FeatherIcons';
import {
  HeaderActions,
  HeaderButton,
  HeaderIconButton,
  HeaderSearch,
  HeaderTab,
  HeaderTabs,
  HeaderTitle,
  PageHeader,
} from '~/components/shared/PageHeader';
import { Popover } from '~/components/shared/Popover';
import { RotateIcon } from '~/components/shared/RotateIcon';
import { TextFilter } from '~/components/shared/TextFilter';
import { proxyFilterText } from '~/store/proxies';

import s from './ProxiesHeader.module.scss';
import Settings from './Settings';

type AppConfig = React.ComponentProps<typeof Settings>['appConfig'];

type TabKey = 'proxies' | 'providers';

type Props = {
  activeTab: TabKey;
  setActiveTab: (tab: TabKey) => void;
  /** 搜索后可见的代理组数 */
  groupCount: number;
  /** 提供商总数，决定标签是否出现（搜索时标签不该消失） */
  providerCount: number;
  /** 搜索后可见的提供商数，只影响标签上的计数 */
  visibleProviderCount: number;
  appConfig: AppConfig;
  isSettingsOpen: boolean;
  toggleSettings: () => void;
  closeSettings: () => void;
  onToggleCollapseAll: () => void;
  allCollapsed: boolean;
  onTestAll: () => void;
  isTestingLatency: boolean;
  onUpdateAllProviders: () => void;
  isUpdatingProviders: boolean;
};

export function ProxiesHeader({
  activeTab,
  setActiveTab,
  groupCount,
  providerCount,
  visibleProviderCount,
  appConfig,
  isSettingsOpen,
  toggleSettings,
  closeSettings,
  onToggleCollapseAll,
  allCollapsed,
  onTestAll,
  isTestingLatency,
  onUpdateAllProviders,
  isUpdatingProviders,
}: Props) {
  const { t } = useTranslation();

  return (
    <PageHeader>
      <HeaderTitle>{t('Proxies')}</HeaderTitle>

      <HeaderTabs label={t('Proxies')}>
        <HeaderTab
          active={activeTab === 'proxies'}
          label={t('proxy_groups')}
          count={groupCount}
          onClick={() => setActiveTab('proxies')}
        />
        {providerCount > 0 ? (
          <HeaderTab
            active={activeTab === 'providers'}
            label={t('providers')}
            count={visibleProviderCount}
            onClick={() => setActiveTab('providers')}
          />
        ) : null}
      </HeaderTabs>

      <HeaderSearch className={s.search}>
        <TextFilter textAtom={proxyFilterText} placeholder={t('search_proxies_placeholder')} />
      </HeaderSearch>

      <HeaderActions className={s.actions}>
        {activeTab === 'providers' && providerCount > 0 ? (
          <HeaderButton
            icon={<RotateIcon isRotating={isUpdatingProviders} />}
            label={t('update_all_proxy_provider')}
            onClick={onUpdateAllProviders}
          />
        ) : null}

        <HeaderButton
          icon={allCollapsed ? <ChevronDown size={17} /> : <ChevronUp size={17} />}
          label={allCollapsed ? t('expand_all') : t('collapse_all')}
          onClick={onToggleCollapseAll}
        />

        <HeaderButton
          variant="primary"
          icon={<Zap size={16} />}
          label={isTestingLatency ? t('testing') : t('test_all')}
          busy={isTestingLatency}
          disabled={isTestingLatency}
          onClick={onTestAll}
        />

        <Popover
          isOpen={isSettingsOpen}
          onClose={closeSettings}
          label={t('settings')}
          trigger={
            <HeaderIconButton
              icon={<Sliders size={17} />}
              label={t('settings')}
              active={isSettingsOpen}
              expanded={isSettingsOpen}
              onClick={toggleSettings}
            />
          }
        >
          <Settings appConfig={appConfig} />
        </Popover>
      </HeaderActions>
    </PageHeader>
  );
}
