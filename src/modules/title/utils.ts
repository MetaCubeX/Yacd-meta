import prettyBytes from '~/misc/pretty-bytes';
import type { TabTitleConfig, TitleSegment, TitleSegmentKind } from '~/store/types';

/** A backend stream that some segments read from. */
export type LiveSource = 'traffic' | 'connections' | 'memory';

type SegmentMeta = { kind: TitleSegmentKind; labelKey: string; source?: LiveSource };

/** Every segment kind in palette order. */
export const TITLE_SEGMENTS: SegmentMeta[] = [
  { kind: 'upload', labelKey: 'title_seg_upload', source: 'traffic' },
  { kind: 'download', labelKey: 'title_seg_download', source: 'traffic' },
  { kind: 'uploadTotal', labelKey: 'title_seg_upload_total', source: 'connections' },
  { kind: 'downloadTotal', labelKey: 'title_seg_download_total', source: 'connections' },
  { kind: 'connections', labelKey: 'title_seg_connections', source: 'connections' },
  { kind: 'memory', labelKey: 'title_seg_memory', source: 'memory' },
  { kind: 'backend', labelKey: 'title_seg_backend' },
  { kind: 'version', labelKey: 'title_seg_version' },
  { kind: 'appTitle', labelKey: 'title_seg_app_title' },
  { kind: 'text', labelKey: 'title_seg_text' },
];

const SEGMENT_META = Object.fromEntries(TITLE_SEGMENTS.map((m) => [m.kind, m])) as Record<
  TitleSegmentKind,
  SegmentMeta
>;

export const segmentLabelKey = (kind: TitleSegmentKind) => SEGMENT_META[kind].labelKey;

const TEXT_ID_PREFIX = 'text:';

/** segmentKindOf maps an editor item id back to its kind; text ids carry a unique suffix. */
export function segmentKindOf(id: string): TitleSegmentKind {
  return id.startsWith(TEXT_ID_PREFIX) ? 'text' : (id as TitleSegmentKind);
}

export function newTextSegmentId() {
  return TEXT_ID_PREFIX + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/** Text that a freshly added custom-text segment starts with. */
export const NEW_TEXT_SEGMENT = '·';

/** Separator choices as [value, i18n key or literal label]. */
export const SEPARATOR_OPTIONS: Array<[string, string]> = [
  [' ', 'title_sep_space'],
  [' · ', '·'],
  [' | ', '|'],
  [' / ', '/'],
  ['', 'title_sep_none'],
];

export const REFRESH_SECONDS_OPTIONS = [1, 2, 3, 5, 10];

export function liveSourcesOf(segments: TitleSegment[]): Record<LiveSource, boolean> {
  const has = (source: LiveSource) => segments.some((s) => SEGMENT_META[s.kind]?.source === source);
  return { traffic: has('traffic'), connections: has('connections'), memory: has('memory') };
}

/** Readings from the backend streams; a field is undefined when its stream sent nothing lately. */
export type LiveValues = Partial<
  Record<'upload' | 'download' | 'uploadTotal' | 'downloadTotal' | 'connections' | 'memory', number>
>;

export type StaticValues = { backend: string; version?: string; appTitle: string };

type Translate = (key: string, options?: Record<string, unknown>) => string;

const MISSING = '–';

function formatSegment(seg: TitleSegment, live: LiveValues, fixed: StaticValues, t: Translate) {
  const bytes = (n: number | undefined) => (n === undefined ? MISSING : prettyBytes(n));
  const rate = (n: number | undefined) => (n === undefined ? MISSING : `${prettyBytes(n)}/s`);
  switch (seg.kind) {
    case 'upload':
      return `↑ ${rate(live.upload)}`;
    case 'download':
      return `↓ ${rate(live.download)}`;
    case 'uploadTotal':
      return `↑ ${bytes(live.uploadTotal)}`;
    case 'downloadTotal':
      return `↓ ${bytes(live.downloadTotal)}`;
    case 'connections':
      return t('title_conns', { n: live.connections ?? MISSING });
    case 'memory':
      return t('title_mem', { value: bytes(live.memory) });
    case 'backend':
      return fixed.backend;
    case 'version':
      return fixed.version ?? '';
    case 'appTitle':
      return fixed.appTitle;
    case 'text':
      return seg.text ?? '';
  }
}

/**
 * formatTabTitle joins the segments with the separator, skipping empty ones. When every live
 * segment lacks a reading (backend unreachable, streams not started) the whole title falls back
 * to the page title, so the tab never shows only placeholders.
 */
export function formatTabTitle(
  config: TabTitleConfig,
  live: LiveValues,
  fixed: StaticValues,
  t: Translate,
) {
  if (!config.enabled) return fixed.appTitle;
  const liveSegments = config.segments.filter((s) => SEGMENT_META[s.kind]?.source);
  const hasReading = liveSegments.some((s) => live[s.kind as keyof LiveValues] !== undefined);
  if (liveSegments.length > 0 && !hasReading) return fixed.appTitle;
  const title = config.segments
    .filter((s) => SEGMENT_META[s.kind])
    .map((s) => formatSegment(s, live, fixed, t))
    .filter((part) => part !== '')
    .join(config.separator);
  return title || fixed.appTitle;
}
