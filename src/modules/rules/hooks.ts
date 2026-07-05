import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { useAtom } from 'jotai';
import * as React from 'react';

import {
  fetchRuleProviders,
  refreshRuleProviderByName,
  updateRuleProviders,
} from '~/api/rule-provider';
import { fetchRules, updateRuleDisabledStatus } from '~/api/rules';
import { ruleFilterText } from '~/store/rules';
import type { ClashAPIConfig } from '~/types';

const { useCallback, useState } = React;

export function useUpdateRuleProviderItem(
  name: string,
  apiConfig: ClashAPIConfig
): [(ev: React.MouseEvent<HTMLButtonElement>) => unknown, boolean] {
  const queryClient = useQueryClient();
  const { mutate, isPending } = useMutation({
    mutationFn: refreshRuleProviderByName,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/providers/rules'] });
    },
  });
  const onClickRefreshButton = (ev: React.MouseEvent<HTMLButtonElement>) => {
    ev.preventDefault();
    mutate({ name, apiConfig });
  };
  return [onClickRefreshButton, isPending];
}

export function useUpdateAllRuleProviderItems(
  apiConfig: ClashAPIConfig
): [(ev: React.MouseEvent<HTMLButtonElement>) => unknown, boolean] {
  const queryClient = useQueryClient();
  const { data: provider } = useRuleProviderQuery(apiConfig);
  const { mutate, isPending } = useMutation({
    mutationFn: updateRuleProviders,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/providers/rules'] });
    },
  });
  const onClickRefreshButton = (ev: React.MouseEvent<HTMLButtonElement>) => {
    ev.preventDefault();
    mutate({ names: provider.names, apiConfig });
  };
  return [onClickRefreshButton, isPending];
}

export function useToggleRuleDisabled(apiConfig: ClashAPIConfig) {
  const queryClient = useQueryClient();
  const { mutate, isPending } = useMutation({
    mutationFn: ({ index, disabled }: { index: number; disabled: boolean }) =>
      updateRuleDisabledStatus(apiConfig, { [index]: disabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/rules'] });
    },
  });
  const toggleRule = useCallback(
    (index: number, disabled: boolean) => mutate({ index, disabled }),
    [mutate]
  );
  return { toggleRule, isPending };
}

export function useInvalidateQueries() {
  const queryClient = useQueryClient();
  return useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['/rules'] });
    queryClient.invalidateQueries({ queryKey: ['/providers/rules'] });
  }, [queryClient]);
}

export function useRuleProviderQuery(apiConfig: ClashAPIConfig) {
  return useSuspenseQuery({
    queryKey: ['/providers/rules', apiConfig],
    queryFn: () => fetchRuleProviders('/providers/rules', apiConfig),
  });
}

export function useRuleAndProvider(apiConfig: ClashAPIConfig) {
  const { data: rules, isFetching } = useSuspenseQuery({
    queryKey: ['/rules', apiConfig],
    queryFn: () => fetchRules('/rules', apiConfig),
  });
  const { data: provider } = useRuleProviderQuery(apiConfig);

  const [filterText] = useAtom(ruleFilterText);
  if (filterText === '') {
    return { rules, provider, isFetching };
  }

  const f = filterText.toLowerCase();
  return {
    rules: rules.filter((r) => r.payload.toLowerCase().indexOf(f) >= 0),
    isFetching,
    provider: {
      byName: provider.byName,
      names: provider.names.filter((t) => t.toLowerCase().indexOf(f) >= 0),
    },
  };
}

export function useRulesPage(apiConfig: ClashAPIConfig) {
  const { rules, provider } = useRuleAndProvider(apiConfig);
  const [activeTab, setActiveTab] = useState('rules');
  const isRulesTab = activeTab === 'rules';

  const handleTabKeyDown = useCallback(
    (tab: string) => (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        setActiveTab(tab);
      }
    },
    []
  );

  return {
    rules,
    provider,
    activeTab,
    setActiveTab,
    isRulesTab,
    handleTabKeyDown,
  };
}