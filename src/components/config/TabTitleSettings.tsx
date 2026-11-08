import * as React from 'react';
import { useTranslation } from 'react-i18next';

import { DualListEditor, type DualListItemContext } from '~/components/shared/DualListEditor';
import Select from '~/components/shared/Select';
import Switch from '~/components/shared/SwitchThemed';
import { useCurrentTabTitle } from '~/modules/title/hooks';
import {
  NEW_TEXT_SEGMENT,
  newTextSegmentId,
  REFRESH_SECONDS_OPTIONS,
  segmentKindOf,
  segmentLabelKey,
  SEPARATOR_OPTIONS,
  TITLE_SEGMENTS,
} from '~/modules/title/utils';
import type { TabTitleConfig, TitleSegment } from '~/store/types';

import s from './TabTitleSettings.module.scss';

const { useCallback, useMemo, useState } = React;

// 1ch 是数字 0 的宽度；CJK 等全角字符大约占两个
function textWidthInCh(text: string) {
  let width = 0;
  for (const ch of text) width += /[ᄀ-￿]/.test(ch) ? 2 : 1;
  return width;
}

type Props = {
  config: TabTitleConfig;
  onChange: (next: TabTitleConfig) => void;
};

/** TabTitleSettings edits which pieces the browser tab title is built from, and in what order. */
export function TabTitleSettings({ config, onChange }: Props) {
  const { t } = useTranslation();
  const preview = useCurrentTabTitle();
  // 可添加区里的「自定义文本」是无限供应的：它总带着一个还没用过的 id，被拖走或添加后换新的
  const [nextTextId, setNextTextId] = useState(newTextSegmentId);

  const enabledIds = useMemo(() => config.segments.map((seg) => seg.id), [config.segments]);

  const getAvailableIds = useCallback(
    (ids: string[]) => [
      ...TITLE_SEGMENTS.filter((m) => m.kind !== 'text' && !ids.includes(m.kind)).map(
        (m) => m.kind,
      ),
      ...(ids.includes(nextTextId) ? [] : [nextTextId]),
    ],
    [nextTextId],
  );

  const setSegmentIds = (ids: string[]) => {
    const byId = new Map(config.segments.map((seg) => [seg.id, seg]));
    const segments = ids.map((id): TitleSegment => {
      const existing = byId.get(id);
      if (existing) return existing;
      const kind = segmentKindOf(id);
      return kind === 'text' ? { id, kind, text: NEW_TEXT_SEGMENT } : { id, kind };
    });
    onChange({ ...config, segments });
    if (ids.includes(nextTextId)) setNextTextId(newTextSegmentId());
  };

  const setText = (id: string, text: string) =>
    onChange({
      ...config,
      segments: config.segments.map((seg) => (seg.id === id ? { ...seg, text } : seg)),
    });

  const renderItem = (id: string, { enabled, isOverlay }: DualListItemContext) => {
    const kind = segmentKindOf(id);
    if (kind !== 'text' || !enabled) return t(segmentLabelKey(kind));
    const text = config.segments.find((seg) => seg.id === id)?.text ?? NEW_TEXT_SEGMENT;
    return (
      <input
        className={s.textInput}
        value={text}
        placeholder={t('title_seg_text')}
        aria-label={t('title_seg_text')}
        readOnly={isOverlay}
        tabIndex={isOverlay ? -1 : undefined}
        // 整块都能按住拖动，在输入框里按下要留给选字和移光标
        onPointerDown={(e) => e.stopPropagation()}
        onChange={(e) => setText(id, e.target.value)}
        // 内边距和边框另算，宽度按内容撑开
        style={{ width: `calc(${Math.max(2, textWidthInCh(text)) + 1}ch + 14px)` }}
      />
    );
  };

  const separatorOptions = SEPARATOR_OPTIONS.map(([value, label]) => [
    value,
    label.startsWith('title_') ? t(label) : label,
  ]);
  const refreshOptions = REFRESH_SECONDS_OPTIONS.map((n) => [String(n), t('title_seconds', { n })]);

  return (
    <div className={s.root}>
      <div className={s.toggleRow}>
        <span className={s.desc}>{t('tab_title_desc')}</span>
        <Switch
          checked={config.enabled}
          onChange={(enabled: boolean) => onChange({ ...config, enabled })}
        />
      </div>

      {config.enabled ? (
        <>
          <div className={s.preview}>
            <span className={s.previewLabel}>{t('tab_title_preview')}</span>
            <span className={s.previewTab} title={preview}>
              {preview}
            </span>
          </div>

          <DualListEditor
            layout="wrap"
            enabledIds={enabledIds}
            getAvailableIds={getAvailableIds}
            onChange={setSegmentIds}
            onAdd={(id) => setSegmentIds([...enabledIds, id])}
            onRemove={(id) => setSegmentIds(enabledIds.filter((each) => each !== id))}
            renderItem={renderItem}
            enabledTitle={t('tab_title_shown')}
            availableTitle={t('tab_title_available')}
            enabledEmptyText={t('tab_title_drop_here')}
            availableEmptyText=""
            addLabel={t('tab_title_add')}
          />

          <div className={s.options}>
            <label className={s.option}>
              <span>{t('tab_title_separator')}</span>
              <Select
                options={separatorOptions}
                selected={config.separator}
                onChange={(e) => onChange({ ...config, separator: e.target.value })}
              />
            </label>
            <label className={s.option}>
              <span>{t('tab_title_refresh')}</span>
              <Select
                options={refreshOptions}
                selected={String(config.refreshSeconds)}
                onChange={(e) => onChange({ ...config, refreshSeconds: Number(e.target.value) })}
              />
            </label>
          </div>
        </>
      ) : null}
    </div>
  );
}
