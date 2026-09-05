import { useTranslation } from 'react-i18next';

import {
  HeaderActions,
  HeaderButton,
  HeaderSearch,
  HeaderTab,
  HeaderTabs,
  HeaderTitle,
  PageHeader,
} from '~/components/shared/PageHeader';
import { RotateIcon } from '~/components/shared/RotateIcon';
import { TextFilter } from '~/components/shared/TextFilter';
import type { RulesTabKey } from '~/modules/rules/utils';
import { ruleFilterText } from '~/store/rules';

import s from './RulesHeader.module.scss';

type Props = {
  activeTab: RulesTabKey;
  setActiveTab: (tab: RulesTabKey) => void;
  /** 搜索后可见的规则数 */
  ruleCount: number;
  /** 提供商总数，决定标签是否出现 */
  providerCount: number;
  /** 搜索后可见的提供商数，只影响标签上的计数 */
  visibleProviderCount: number;
  onUpdateAllProviders: () => void;
  isUpdatingProviders: boolean;
};

export function RulesHeader({
  activeTab,
  setActiveTab,
  ruleCount,
  providerCount,
  visibleProviderCount,
  onUpdateAllProviders,
  isUpdatingProviders,
}: Props) {
  const { t } = useTranslation();

  return (
    <PageHeader>
      <HeaderTitle>{t('Rules')}</HeaderTitle>

      <HeaderTabs label={t('Rules')}>
        <HeaderTab
          active={activeTab === 'rules'}
          label={t('Rules')}
          count={ruleCount}
          onClick={() => setActiveTab('rules')}
        />
        {providerCount > 0 ? (
          <HeaderTab
            active={activeTab === 'providers'}
            label={t('rule_provider')}
            count={visibleProviderCount}
            onClick={() => setActiveTab('providers')}
          />
        ) : null}
      </HeaderTabs>

      <HeaderSearch className={s.search}>
        <TextFilter textAtom={ruleFilterText} placeholder={t('search_rules_placeholder')} />
      </HeaderSearch>

      {/* 和代理页一致：更新全部只在提供商标签页出现 */}
      {activeTab === 'providers' && providerCount > 0 ? (
        <HeaderActions className={s.actions}>
          <HeaderButton
            variant="primary"
            icon={<RotateIcon isRotating={isUpdatingProviders} />}
            label={t('update_all_rule_provider')}
            busy={isUpdatingProviders}
            onClick={onUpdateAllProviders}
          />
        </HeaderActions>
      ) : null}
    </PageHeader>
  );
}
