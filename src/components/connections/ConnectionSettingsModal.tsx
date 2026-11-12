import * as Tabs from '@radix-ui/react-tabs';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

import { Columns, Sliders, Tag, Trash2, X } from '~/components/shared/FeatherIcons';
import Modal from '~/components/shared/Modal';
import Switch from '~/components/shared/SwitchThemed';
import { useSlidingIndicator } from '~/hooks/useSlidingIndicator';
import { ConnectionColumn, ConnectionSettings, SourceMapItem } from '~/modules/connections/utils';

import { ColumnsEditor } from './ColumnsEditor';
import s from './ConnectionSettingsModal.module.scss';

type Props = {
  isOpen: boolean;
  onRequestClose: () => void;
  settings: ConnectionSettings;
  updateSettings: (patch: Partial<ConnectionSettings>) => void;
  visibleColumns: ConnectionColumn[];
  addColumn: (id: string) => void;
  removeColumn: (id: string) => void;
  setColumns: (ids: string[]) => void;
  resetColumns: () => void;
  sourceMap: SourceMapItem[];
  setSourceMap: (updater: React.SetStateAction<SourceMapItem[]>) => void;
};

type PaneId = 'general' | 'columns' | 'tags';

type NavItem = { id: PaneId; label: string; icon: React.ReactNode };

export default function ConnectionSettingsModal({
  isOpen,
  onRequestClose,
  settings,
  updateSettings,
  visibleColumns,
  addColumn,
  removeColumn,
  setColumns,
  resetColumns,
  sourceMap,
  setSourceMap,
}: Props) {
  const { t } = useTranslation();
  const [pane, setPane] = React.useState<PaneId>('general');
  // Escape cancels a column drag; it must not also close the dialog.
  const [isDragging, setIsDragging] = React.useState(false);

  const enabledIds = React.useMemo(() => visibleColumns.map((c) => c.id), [visibleColumns]);

  const setSource = (key: keyof SourceMapItem, index: number, value: string) => {
    setSourceMap((prev) => prev.map((item, i) => (i === index ? { ...item, [key]: value } : item)));
  };

  const navItems: NavItem[] = [
    { id: 'general', label: t('conn_settings_general'), icon: <Sliders size={15} /> },
    { id: 'columns', label: t('custom_columns'), icon: <Columns size={15} /> },
    { id: 'tags', label: t('client_tag'), icon: <Tag size={15} /> },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      shouldCloseOnEsc={!isDragging}
      title={t('conn_settings')}
      className={s.modal}
      overlayClassName={s.overlay}
    >
      <div className={s.header}>
        <span className={s.headerTitle}>{t('conn_settings')}</span>
        <button
          type="button"
          className={s.headerClose}
          onClick={onRequestClose}
          aria-label={t('close')}
        >
          <X size={15} />
        </button>
      </div>

      <Tabs.Root
        className={s.layout}
        value={pane}
        onValueChange={(value) => setPane(value as PaneId)}
        orientation="vertical"
      >
        <PaneNav label={t('conn_settings')} items={navItems} />

        <Tabs.Content value="general" className={s.pane}>
          <PaneHead title={t('conn_settings_general')} />
          <div className={s.settings}>
            <div className={s.setting}>
              <SettingHead
                label={t('hide_conn')}
                hint={t('hide_conn_hint')}
                checked={settings.hideEnabled}
                onChange={(value) => updateSettings({ hideEnabled: value })}
              />
              <input
                type="text"
                className={s.textInput}
                value={settings.hideRegex}
                placeholder="direct|dns-out"
                aria-label={t('hide_conn_regex')}
                onChange={(e) => updateSettings({ hideRegex: e.target.value })}
              />
            </div>
            <div className={s.setting}>
              <SettingHead
                label={t('full_chain')}
                checked={settings.fullChain}
                onChange={(value) => updateSettings({ fullChain: value })}
              />
            </div>
          </div>
        </Tabs.Content>

        <Tabs.Content value="columns" className={s.pane}>
          <PaneHead
            title={t('custom_columns')}
            action={
              <button type="button" className={s.ghostBtn} onClick={resetColumns}>
                {t('reset_default_columns')}
              </button>
            }
          />
          <ColumnsEditor
            enabledIds={enabledIds}
            setColumns={setColumns}
            addColumn={addColumn}
            removeColumn={removeColumn}
            onDraggingChange={setIsDragging}
          />
        </Tabs.Content>

        <Tabs.Content value="tags" className={s.pane}>
          <PaneHead
            title={t('client_tag')}
            desc={t('sourceip_tip')}
            action={
              <button
                type="button"
                className={s.ghostBtn}
                onClick={() => setSourceMap((prev) => [...prev, { reg: '', name: '' }])}
              >
                {t('add_tag')}
              </button>
            }
          />
          {sourceMap.length === 0 ? (
            <div className={s.empty}>{t('client_tag_empty')}</div>
          ) : (
            <div className={s.tagTable}>
              <div className={s.tagHead}>
                <span>{t('c_source')}</span>
                <span>{t('device_name')}</span>
              </div>
              {sourceMap.map((item, index) => (
                <div key={index} className={s.tagRow}>
                  <input
                    type="text"
                    className={s.textInput}
                    value={item.reg}
                    placeholder="192.168.1.10"
                    aria-label={t('c_source')}
                    onChange={(e) => setSource('reg', index, e.target.value)}
                  />
                  <input
                    type="text"
                    className={s.textInput}
                    value={item.name}
                    placeholder={t('device_name')}
                    aria-label={t('device_name')}
                    onChange={(e) => setSource('name', index, e.target.value)}
                  />
                  <button
                    type="button"
                    className={s.deleteBtn}
                    onClick={() => setSourceMap((prev) => prev.filter((_, i) => i !== index))}
                    title={t('delete')}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Tabs.Content>
      </Tabs.Root>

      <div className={s.footer}>
        <button type="button" className={s.primaryBtn} onClick={onRequestClose}>
          {t('done')}
        </button>
      </div>
    </Modal>
  );
}

// A component of its own so its hook mounts with the dialog content: the dialog renders its
// content a render after it opens, which the modal's own hooks would not see.
function PaneNav({ label, items }: { label: string; items: NavItem[] }) {
  const { containerRef, indicatorRef } = useSlidingIndicator('[data-state="active"]');
  return (
    <Tabs.List className={s.nav} aria-label={label} ref={containerRef}>
      <div className={s.navIndicator} ref={indicatorRef} aria-hidden="true" />
      {items.map((item) => (
        <Tabs.Trigger key={item.id} value={item.id} className={s.navItem}>
          <span className={s.navIcon}>{item.icon}</span>
          <span className={s.navLabel}>{item.label}</span>
        </Tabs.Trigger>
      ))}
    </Tabs.List>
  );
}

function PaneHead({
  title,
  desc,
  action,
}: {
  title: string;
  desc?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className={s.paneHead}>
      <div className={s.paneHeadText}>
        <h3 className={s.paneTitle}>{title}</h3>
        {desc ? <p className={s.paneDesc}>{desc}</p> : null}
      </div>
      {action ? <div className={s.paneAction}>{action}</div> : null}
    </div>
  );
}

function SettingHead({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  // The label names the switch and makes the text a click target for it too. The rule cannot
  // see that SwitchThemed renders a <button>, which is a labelable element.
  return (
    <label className={s.settingHead}>
      <span className={s.settingText}>
        <span className={s.settingLabel}>{label}</span>
        {hint ? <span className={s.settingHint}>{hint}</span> : null}
      </span>
      <span className={s.settingControl}>
        <Switch checked={checked} onChange={onChange} />
      </span>
    </label>
  );
}
