import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { RowComponentProps, List as VirtualList } from 'react-window';

import { useMediaQuery } from '~/hooks/useMediaQuery';
import { useRulesPage, useUpdateAllRuleProviderItems } from '~/modules/rules/hooks';
import { RULE_ROW_HEIGHT, RULE_ROW_HEIGHT_NARROW, type RulesRowProps } from '~/modules/rules/utils';
import { ClashAPIConfig } from '~/types';

import Rule, { RuleListHeader } from './Rule';
import { RuleProviderItem } from './RuleProviderItem';
import s from './Rules.module.scss';
import { RulesHeader } from './RulesHeader';

const NO_USAGE: string[] = [];

function Row({
  index,
  style,
  rules,
  provider,
  apiConfig,
  totalEvals,
}: RowComponentProps<RulesRowProps>) {
  return (
    <div style={style} className={s.row}>
      <Rule {...rules[index]} apiConfig={apiConfig} provider={provider} totalEvals={totalEvals} />
    </div>
  );
}

type RulesProps = {
  apiConfig: ClashAPIConfig;
};

export default function Rules({ apiConfig }: RulesProps) {
  const { t, i18n } = useTranslation();
  const {
    rules,
    provider,
    providerCount,
    totalEvals,
    providerUsage,
    activeTab,
    setActiveTab,
    isRulesTab,
  } = useRulesPage(apiConfig);
  const [updateAllProviders, isUpdatingProviders] = useUpdateAllRuleProviderItems(apiConfig);
  const isNarrow = useMediaQuery('(max-width: 768px)');

  const rowCount = isRulesTab ? rules.length : provider.names.length;

  // rowProps 每次渲染新建对象会让所有行跟着重渲染，虚拟列表就白做了
  const rowProps = React.useMemo<RulesRowProps>(
    () => ({ rules, provider, apiConfig, totalEvals }),
    [rules, provider, apiConfig, totalEvals],
  );

  const rowHeight = isNarrow ? RULE_ROW_HEIGHT_NARROW : RULE_ROW_HEIGHT;

  const rowKey = React.useCallback(
    (index: number, { rules }: RulesRowProps) => rules[index].id,
    [],
  );

  let body: React.ReactNode;
  if (rowCount === 0) {
    body = (
      <div className={s.empty}>
        <span className={s.emptyTitle}>
          {t(isRulesTab ? 'rules_empty_title' : 'rule_providers_empty_title')}
        </span>
      </div>
    );
  } else if (isRulesTab) {
    body = (
      <>
        <RuleListHeader />
        <div className={s.listWrap}>
          <VirtualList
            style={{ height: '100%', width: '100%' }}
            rowCount={rowCount}
            rowHeight={rowHeight}
            rowComponent={Row}
            rowKey={rowKey}
            rowProps={rowProps}
          />
        </div>
      </>
    );
  } else {
    // 提供商通常只有几十个，直接铺网格，不走虚拟列表
    body = (
      <div className={s.providerScroll}>
        <div className={s.providerGrid}>
          {provider.names.map((name) => (
            <RuleProviderItem
              key={name}
              apiConfig={apiConfig}
              usedBy={providerUsage[name] ?? NO_USAGE}
              {...provider.byName[name]}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={s.page}>
      <RulesHeader
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        ruleCount={rules.length}
        providerCount={providerCount}
        visibleProviderCount={provider.names.length}
        onUpdateAllProviders={updateAllProviders}
        isUpdatingProviders={isUpdatingProviders}
      />

      <div className={s.listArea}>
        <div className={s.card}>
          {body}

          <div className={s.footer}>
            <span>{t('rules_shown', { count: rowCount })}</span>
            {isRulesTab && totalEvals > 0 ? (
              <span title={t('rule_funnel_legend')}>
                {t('rules_total_evals', { total: totalEvals.toLocaleString(i18n.language) })}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
