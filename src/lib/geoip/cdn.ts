/**
 * cdn.yml reader.
 *
 * Format: a flat YAML map of `domain_pattern -> {name, link}`.
 * - Plain keys (e.g. `cloudfront.net`) match exact hostnames or any
 *   suffix-ancestor (so `a.b.cloudfront.net` is matched because we walk
 *   `cloudfront.net` → `b.cloudfront.net` → `a.b.cloudfront.net`).
 * - Regex keys (matching the Go side's `re.MaybeRegexp`) are compiled
 *   once and tried as a fallback after exact match fails for a suffix.
 *
 * Reference: github.com/zu1k/nali/pkg/cdn
 */

import yaml from 'js-yaml';

export interface CdnEntry {
  name: string;
  link: string;
}

interface RawCdnEntry {
  name?: string;
  link?: string;
}

export interface CdnSearcher {
  lookup(host: string): CdnEntry | null;
  size: number;
}

/** Heuristic that mirrors nali's `re.MaybeRegexp`: does the key look like regex? */
function looksLikeRegex(key: string): boolean {
  // Plain domains are at most one period per label and contain only
  // alphanumerics, hyphens, dots. Anything containing other metachars
  // is treated as regex. nali's exact rule is looser but this works
  // for the current cdn.yml.
  return /[()[\]{}*+?\\|^$]/.test(key);
}

/**
 * Build the progressively-longer suffix list of a hostname.
 *
 *   "a.b.cloudfront.net" -> ["net", "cloudfront.net", "b.cloudfront.net", "a.b.cloudfront.net"]
 */
function suffixChain(host: string): string[] {
  const parts = host.split('.');
  if (parts.length === 0) return [];
  const out: string[] = [];
  let acc = parts[parts.length - 1]!;
  out.push(acc);
  for (let i = parts.length - 2; i >= 0; i--) {
    acc = parts[i] + '.' + acc;
    out.push(acc);
  }
  return out;
}

export function createCdnSearcher(yamlText: string): CdnSearcher {
  const raw = (yaml.load(yamlText) ?? {}) as Record<string, RawCdnEntry>;
  const exact = new Map<string, CdnEntry>();
  const patterns: Array<{ re: RegExp; entry: CdnEntry }> = [];

  for (const [key, val] of Object.entries(raw)) {
    const entry: CdnEntry = {
      name: val?.name ?? key,
      link: val?.link ?? '',
    };
    if (looksLikeRegex(key)) {
      try {
        patterns.push({ re: new RegExp(key, 'i'), entry });
      } catch {
        // skip invalid regex
      }
    } else {
      exact.set(key.toLowerCase(), entry);
    }
  }

  function lookup(host: string): CdnEntry | null {
    const suffixes = suffixChain(host.toLowerCase());
    for (const s of suffixes) {
      const hit = exact.get(s);
      if (hit) return hit;
    }
    for (const s of suffixes) {
      for (const { re, entry } of patterns) {
        if (re.test(s)) return entry;
      }
    }
    return null;
  }

  return { lookup, size: exact.size + patterns.length };
}
