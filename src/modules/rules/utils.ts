import type { RuleProvider } from '~/api/rule-provider';
import type { RuleItem } from '~/api/rules';
import type { ClashAPIConfig } from '~/types';

export type RuleProviderIndex = {
  byName: Record<string, RuleProvider>;
  names: string[];
};

export type RulesTabKey = 'rules' | 'providers';

export type RulesRowProps = {
  rules: RuleItem[];
  provider: RuleProviderIndex;
  apiConfig: ClashAPIConfig;
  /** 当前规则表里最大的命中数，命中条按它归一 */
  maxHits: number;
};

// 虚拟列表要求定高。宽屏一行排开，payload 最多折两行；
// 窄屏 payload 和元信息各占一行
export const RULE_ROW_HEIGHT = 52;
export const RULE_ROW_HEIGHT_NARROW = 76;

export type PayloadTokenKind = 'paren' | 'op' | 'sep' | 'type' | 'value' | 'space';
export type PayloadToken = { kind: PayloadTokenKind; text: string };

// `!` 只在紧跟 `(` 时是取反运算符，`category-ai-!cn` 这类名字里的 `!` 是普通字符
const LOGIC_SPLIT = /(&&|\|\||!(?=\()|\(|\)|,)/;

/**
 * tokenizeLogicPayload splits an AND/OR/NOT payload such as
 * `((RuleSet,cn) && (NOT,(!(DstPort,443))))` into tokens for highlighting.
 * A word directly between `(` and `,` is a rule type; any other word is a value.
 */
export function tokenizeLogicPayload(payload: string): PayloadToken[] {
  const parts = payload.split(LOGIC_SPLIT).filter((p) => p !== '');
  return parts.map((text, i) => {
    if (text === '(' || text === ')') return { kind: 'paren', text };
    if (text === '&&' || text === '||' || text === '!') return { kind: 'op', text };
    if (text === ',') return { kind: 'sep', text };
    if (text.trim() === '') return { kind: 'space', text };
    const isType = parts[i - 1] === '(' && parts[i + 1] === ',';
    return { kind: isType ? 'type' : 'value', text };
  });
}

export function isLogicPayload(payload: string): boolean {
  return payload.startsWith('(');
}

const RULESET_REF = /\(RuleSet,([^(),]+)\)/g;

/**
 * collectProviderUsage maps each rule-provider name to the policies of the
 * rules that reference it, either directly (`RULE-SET`) or inside a logic rule.
 * Policies keep first-seen order and are deduplicated.
 */
export function collectProviderUsage(rules: RuleItem[]): Record<string, string[]> {
  const usage: Record<string, string[]> = {};
  const add = (name: string, proxy: string) => {
    const list = (usage[name] ??= []);
    if (!list.includes(proxy)) list.push(proxy);
  };
  for (const r of rules) {
    if (r.type === 'RuleSet') {
      add(r.payload, r.proxy);
    } else if (isLogicPayload(r.payload)) {
      for (const m of r.payload.matchAll(RULESET_REF)) add(m[1], r.proxy);
    }
  }
  return usage;
}

/**
 * hitBarRatio returns the bar length in [0, 1] for a hit count.
 * Log scale: MATCH 一类兜底规则的命中数常比其他规则高两三个数量级，
 * 线性刻度下其余规则的条全都看不见。
 */
export function hitBarRatio(hits: number, maxHits: number): number {
  if (hits <= 0 || maxHits <= 0) return 0;
  return Math.log1p(hits) / Math.log1p(maxHits);
}
