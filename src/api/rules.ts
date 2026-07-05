import invariant from 'invariant';

import { getURLAndInit } from '~/misc/request-helper';
import { ClashAPIConfig } from '~/types';

// const endpoint = '/rules';

export type RuleExtra = {
  disabled: boolean;
  hitCount: number;
  hitAt: string;
  missCount: number;
  missAt: string;
};

export type RuleItem = RuleAPIItem & { id: number };

export type RuleAPIItem = {
  index?: number;
  type: string;
  payload: string;
  proxy: string;
  size: number;
  extra?: RuleExtra;
};

function normalizeAPIResponse(json: { rules: Array<RuleAPIItem> }): Array<RuleItem> {
  invariant(
    json.rules && json.rules.length >= 0,
    'there is no valid rules list in the rules API response'
  );

  // attach an id, preferring the backend-provided index over array position
  return json.rules.map((r: RuleAPIItem, i: number) => ({
    ...r,
    id: typeof r.index === 'number' ? r.index : i,
  }));
}

export async function fetchRules(endpoint: string, apiConfig: ClashAPIConfig) {
  let json = { rules: [] };
  try {
    const { url, init } = getURLAndInit(apiConfig);
    const res = await fetch(url + endpoint, init);
    if (res.ok) {
      json = await res.json();
    }
  } catch (err) {
    // log and ignore

    console.log('failed to fetch rules', err);
  }
  return normalizeAPIResponse(json);
}

export async function updateRuleDisabledStatus(
  apiConfig: ClashAPIConfig,
  updates: Record<number, boolean>
) {
  const { url, init } = getURLAndInit(apiConfig);
  try {
    const res = await fetch(url + '/rules/disable', {
      method: 'PATCH',
      ...init,
      body: JSON.stringify(updates),
    });
    return res.ok;
  } catch (err) {
    // log and ignore

    console.log('failed to PATCH /rules/disable', err);
    return false;
  }
}
