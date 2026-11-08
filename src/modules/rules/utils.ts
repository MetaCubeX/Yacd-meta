import type { RuleProvider } from '~/api/rule-provider';
import type { RuleExtra, RuleItem } from '~/api/rules';
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
  /** 漏斗最宽处的检查次数，见 totalEvaluations */
  totalEvals: number;
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

export type RuleFunnel = {
  /** 轮到本条规则检查的次数 */
  reached: number;
  hits: number;
  /** reached / total */
  reachedRatio: number;
  /** hits / total */
  hitRatio: number;
};

/**
 * ruleFunnel places one rule on the match funnel. `total` is the number of
 * evaluations that reached the first enabled rule, see totalEvaluations.
 *
 * reached 取本条自己的 hit + miss，不用上一条的 miss 推算：命中不等于被吃掉
 * （策略为 PASS、找不到策略、UDP 不支持时 mihomo 会接着往下匹配），
 * 禁用的规则计数冻结也会让推算断掉。
 */
export function ruleFunnel(extra: RuleExtra, total: number): RuleFunnel {
  const hits = extra.hitCount;
  const reached = hits + extra.missCount;
  if (total <= 0) return { reached, hits, reachedRatio: 0, hitRatio: 0 };
  return { reached, hits, reachedRatio: reached / total, hitRatio: hits / total };
}

/**
 * totalEvaluations is the widest point of the funnel: the most evaluations any
 * single rule saw. 计数从核心启动或配置重载时归零，这里只对同一批计数有意义。
 */
export function totalEvaluations(rules: RuleItem[]): number {
  let max = 0;
  for (const r of rules) {
    if (r.extra) max = Math.max(max, r.extra.hitCount + r.extra.missCount);
  }
  return max;
}
