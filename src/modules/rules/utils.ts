import { ClashAPIConfig } from '~/types';

export type RulesListItemData = {
  rules: any[] | null;
  provider: any;
  apiConfig: ClashAPIConfig;
};

export function itemKey(index: number, { rules, provider }: RulesListItemData) {
  if (!rules) {
    return provider.names[index];
  }
  return rules[index].id;
}

export function getItemSizeFactory({ isRulesTab }: { isRulesTab: boolean }) {
  return function getItemSize() {
    return isRulesTab ? 88 : 100;
  };
}

export function formatQty(qty: number) {
  return qty < 100 ? String(qty) : '99+';
}
