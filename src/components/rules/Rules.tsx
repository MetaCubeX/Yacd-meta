import cx from 'clsx';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { List as VirtualList, RowComponentProps } from 'react-window';

import ContentHeader from '~/components/ContentHeader';
import { TextFilter } from '~/components/shared/TextFitler';
import useRemainingViewPortHeight from '~/hooks/useRemainingViewPortHeight';
import { useRulesPage } from '~/modules/rules/hooks';
import { formatQty, getItemSizeFactory, RulesListItemData } from '~/modules/rules/utils';
import { ruleFilterText } from '~/store/rules';
import { ClashAPIConfig } from '~/types';

import Rule from './Rule';
import { RuleProviderItem } from './RuleProviderItem';
import s from './Rules.module.scss';
import { RulesPageFab } from './RulesPageFab';

type RulesRowProps = {
  data: RulesListItemData;
};

function Row({ index, style, data }: RowComponentProps<RulesRowProps>) {
  const { rules, provider, apiConfig } = data;

  if (!rules) {
    const name = provider.names[index];
    const item = provider.byName[name];
    return (
      <div style={style} className={s.RuleProviderItemWrapper}>
        <RuleProviderItem apiConfig={apiConfig} {...item} />
      </div>
    );
  }

  const r = rules[index];
  return (
    <div style={style}>
      <Rule {...r} apiConfig={apiConfig} provider={provider} />
    </div>
  );
}

type RulesProps = {
  apiConfig: ClashAPIConfig;
};

export default function Rules({ apiConfig }: RulesProps) {
  const [refRulesContainer, containerHeight] = useRemainingViewPortHeight();
  const { rules, provider, activeTab, setActiveTab, isRulesTab, handleTabKeyDown } =
    useRulesPage(apiConfig);
  const getItemSize = getItemSizeFactory({ isRulesTab });

  const { t } = useTranslation();

  return (
    <div className={s.container}>
      <ContentHeader>
        <div className={s.tabsContainer}>
          <div
            className={cx(s.tab, { [s.active]: activeTab === 'rules' })}
            onClick={() => setActiveTab('rules')}
            onKeyDown={handleTabKeyDown('rules')}
            role="button"
            tabIndex={0}
          >
            {t('Rules')}
            <span className={s.tabCount}>{formatQty(rules.length)}</span>
          </div>
          {provider.names.length > 0 && (
            <div
              className={cx(s.tab, { [s.active]: activeTab === 'providers' })}
              onClick={() => setActiveTab('providers')}
              onKeyDown={handleTabKeyDown('providers')}
              role="button"
              tabIndex={0}
            >
              {t('rule_provider')}
              <span className={s.tabCount}>{formatQty(provider.names.length)}</span>
            </div>
          )}
        </div>
        <div style={{ flex: 1 }} />
        <div className={s.filterWrapper}>
          <TextFilter textAtom={ruleFilterText} placeholder={t('Search')} />
        </div>
      </ContentHeader>
      <div ref={refRulesContainer} className={s.listWrapper}>
        <VirtualList
          style={{ height: containerHeight, width: '100%' }}
          rowCount={isRulesTab ? rules.length : provider.names.length}
          rowHeight={getItemSize}
          rowComponent={Row}
          rowProps={{
            data: { rules: isRulesTab ? rules : null, provider, apiConfig } as RulesListItemData,
          }}
        />
      </div>
      {provider && provider.names && provider.names.length > 0 ? (
        <RulesPageFab apiConfig={apiConfig} />
      ) : null}
    </div>
  );
}
