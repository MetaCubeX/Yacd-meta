import * as React from 'react';
import { useTranslation } from 'react-i18next';

import { useUpdateAllRuleProviderItems } from '~/components/rules/rules.hooks';
import { Fab, position as fabPosition } from '~/components/shared/Fab';
import { RotateIcon } from '~/components/shared/RotateIcon';
import { ClashAPIConfig } from '~/types';

type RulesPageFabProps = {
  apiConfig: ClashAPIConfig;
};

export function RulesPageFab({ apiConfig }: RulesPageFabProps) {
  const [update, isLoading] = useUpdateAllRuleProviderItems(apiConfig);
  const { t } = useTranslation();
  return (
    <Fab
      icon={<RotateIcon isRotating={isLoading} />}
      text={t('update_all_rule_provider')}
      style={fabPosition}
      onClick={update}
    />
  );
}
