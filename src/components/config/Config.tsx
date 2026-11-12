import * as React from 'react';
import { useTranslation } from 'react-i18next';

import Button from '~/components/shared/Button';
import {
  Cpu,
  DownloadCloud,
  GitHub,
  LogOut,
  Monitor,
  RotateCw,
  Settings,
  Tool,
  Trash2,
} from '~/components/shared/FeatherIcons';
import Input from '~/components/shared/Input';
import Select from '~/components/shared/Select';
import { Selection2 } from '~/components/shared/Selection';
import Switch from '~/components/shared/SwitchThemed';
import TrafficChartSample from '~/components/shared/TrafficChartSample';
import { useConfigPage } from '~/modules/config/hooks';
import {
  CONFIG_CHART_STYLE_PROPS,
  CORE_META,
  LANGUAGE_OPTIONS,
  LOG_LEVEL_OPTIONS,
  MODE_OPTIONS,
  PORT_FIELDS,
  TUN_STACK_OPTIONS,
} from '~/modules/config/utils';
import { useStoreActions } from '~/store/StateProvider';
import { ClashGeneralConfig, DispatchFn, TabTitleConfig } from '~/store/types';
import { ClashAPIConfig } from '~/types';

import s0 from './Config.module.scss';
import { TabTitleSettings } from './TabTitleSettings';

const YACD_REPO_URL = 'https://github.com/metacubex/yacd';

type Props = {
  dispatch: DispatchFn;
  configs: ClashGeneralConfig;
  selectedChartStyleIndex: number;
  apiConfig: ClashAPIConfig;
  tabTitle: TabTitleConfig;
};

export default function Config({
  dispatch,
  configs,
  selectedChartStyleIndex,
  apiConfig,
  tabTitle,
}: Props) {
  const { t, i18n } = useTranslation();

  const { selectChartStyleIndex, updateAppConfig } = useStoreActions();
  const {
    configState,
    openAPIConfigModal,
    handleInputOnChange,
    handleInputOnBlur,
    runAction,
    pendingAction,
    upgradingChannel,
    versionQuery: { data: version },
    coreUpdate,
  } = useConfigPage({
    apiConfig,
    configs,
    dispatch,
    updateAppConfig,
  });
  const coreMeta = CORE_META[version.core];
  // sing-box 的 clash API 只是子集：没有端口、TUN、内核/面板/GEO 升级和重启。
  // 版本号跟着升级按钮走，sing-box 的版本号放在当前后端里
  const isMihomo = version.core === 'mihomo';

  return (
    <div>
      <div className={s0.root}>
        <div className={s0.card}>
          <div className={s0.sectionTitle}>
            <Settings size={20} />
            {t('general')}
          </div>
          <div className={s0.section}>
            {isMihomo &&
              PORT_FIELDS.map((f) =>
                configState[f.key] !== undefined ? (
                  <div key={f.key}>
                    <div className={s0.label}>{f.label}</div>
                    <Input
                      name={f.key}
                      value={configState[f.key]}
                      onChange={({ target: { name, value } }) =>
                        handleInputOnChange({ name, value })
                      }
                      onBlur={handleInputOnBlur}
                    />
                  </div>
                ) : null,
              )}

            <div>
              <div className={s0.label}>Mode</div>
              <Select
                options={
                  configState['mode-list']
                    ? configState['mode-list'].map((value) => [value, value])
                    : MODE_OPTIONS
                }
                selected={
                  configState['mode-list'] ? configState.mode : configState.mode.toLowerCase()
                }
                onChange={(e) => handleInputOnChange({ name: 'mode', value: e.target.value })}
              />
            </div>

            <div>
              <div className={s0.label}>Log Level</div>
              <Select
                options={LOG_LEVEL_OPTIONS}
                selected={configState['log-level'].toLowerCase()}
                onChange={(e) => handleInputOnChange({ name: 'log-level', value: e.target.value })}
              />
            </div>

            {isMihomo && (
              <div>
                <div className={s0.label}>{t('allow_lan')}</div>
                <div className={s0.wrapSwitch}>
                  <Switch
                    name="allow-lan"
                    checked={configState['allow-lan']}
                    onChange={(value: boolean) =>
                      handleInputOnChange({ name: 'allow-lan', value: value })
                    }
                  />
                </div>
              </div>
            )}

            {isMihomo && (
              <div>
                <div className={s0.label}>{t('tls_sniffing')}</div>
                <div className={s0.wrapSwitch}>
                  <Switch
                    name="sniffing"
                    checked={configState['sniffing']}
                    onChange={(value: boolean) =>
                      handleInputOnChange({ name: 'sniffing', value: value })
                    }
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {isMihomo && (
          <div className={s0.card}>
            <div className={s0.sectionTitle}>
              <Cpu size={20} />
              TUN
            </div>
            <div className={s0.section}>
              <div>
                <div className={s0.label}>{t('enable_tun_device')}</div>
                <div className={s0.wrapSwitch}>
                  <Switch
                    checked={configState['tun']?.enable}
                    onChange={(value: boolean) =>
                      handleInputOnChange({ name: 'enable', value: value })
                    }
                  />
                </div>
              </div>
              <div>
                <div className={s0.label}>TUN IP Stack</div>
                <Select
                  options={TUN_STACK_OPTIONS}
                  selected={configState.tun?.stack?.toLowerCase()}
                  onChange={(e) => handleInputOnChange({ name: 'stack', value: e.target.value })}
                />
              </div>
              <div>
                <div className={s0.label}>Device Name</div>
                <Input
                  name="device name"
                  value={configState.tun?.device}
                  onChange={handleInputOnBlur}
                />
              </div>
              <div>
                <div className={s0.label}>Interface Name</div>
                <Input
                  name="interface name"
                  value={configState['interface-name'] || ''}
                  onChange={handleInputOnBlur}
                />
              </div>
            </div>
          </div>
        )}

        <div className={s0.card}>
          <div className={s0.sectionTitle}>
            <Tool size={20} />
            {t('management')}
          </div>
          <div className={s0.section}>
            {isMihomo && (
              <div>
                <div className={s0.label}>{coreMeta.name}</div>
                {version.version ? (
                  <VersionLine version={version.version} link={coreMeta.link} />
                ) : null}
                {coreUpdate ? (
                  <a
                    className={s0.updateHint}
                    href={coreUpdate.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span className={s0.updateDot} />
                    {t('new_version_available', { version: coreUpdate.version })}
                  </a>
                ) : null}
                <div className={s0.buttonGroup}>
                  <Button
                    className={coreUpdate?.channel === 'release' ? s0.withUpdateDot : undefined}
                    start={<DownloadCloud size={16} />}
                    label={t('upgrade_core_release')}
                    isLoading={upgradingChannel === 'release'}
                    disabled={pendingAction !== null}
                    onClick={() => runAction('upgrade_core', 'release')}
                  />
                  <Button
                    className={coreUpdate?.channel === 'alpha' ? s0.withUpdateDot : undefined}
                    start={<DownloadCloud size={16} />}
                    label={t('upgrade_core_alpha')}
                    isLoading={upgradingChannel === 'alpha'}
                    disabled={pendingAction !== null}
                    onClick={() => runAction('upgrade_core', 'alpha')}
                  />
                </div>
              </div>
            )}
            {isMihomo && (
              <div>
                <div className={s0.label}>Yacd</div>
                <VersionLine version={__VERSION__} link={YACD_REPO_URL} />
                <Button
                  start={<DownloadCloud size={16} />}
                  label={t('upgrade_ui')}
                  isLoading={pendingAction === 'upgrade_ui'}
                  disabled={pendingAction !== null}
                  onClick={() => runAction('upgrade_ui')}
                />
              </div>
            )}
            <div>
              <div className={s0.label}>{t('label_reload')}</div>
              <Button
                start={<RotateCw size={16} />}
                label={t('reload_config_file')}
                isLoading={pendingAction === 'reload_config'}
                disabled={pendingAction !== null}
                onClick={() => runAction('reload_config')}
              />
            </div>
            {isMihomo && (
              <div>
                <div className={s0.label}>{t('label_geo_databases')}</div>
                <Button
                  start={<DownloadCloud size={16} />}
                  label={t('upgrade_geo')}
                  isLoading={pendingAction === 'upgrade_geo'}
                  disabled={pendingAction !== null}
                  onClick={() => runAction('upgrade_geo')}
                />
              </div>
            )}
            <div>
              <div className={s0.label}>{t('label_fake_ip')}</div>
              <Button
                start={<Trash2 size={16} />}
                label={t('flush_fake_ip_pool')}
                isLoading={pendingAction === 'flush_fake_ip_pool'}
                disabled={pendingAction !== null}
                onClick={() => runAction('flush_fake_ip_pool')}
              />
            </div>
            {isMihomo && (
              <div>
                <div className={s0.label}>{t('label_restart')}</div>
                <Button
                  start={<RotateCw size={16} />}
                  label={t('restart_core')}
                  isLoading={pendingAction === 'restart_core'}
                  disabled={pendingAction !== null}
                  onClick={() => runAction('restart_core')}
                />
              </div>
            )}
          </div>
        </div>

        <div className={s0.card}>
          <div className={s0.sectionTitle}>
            <Monitor size={20} />
            {t('dashboard')}
          </div>
          <div className={s0.section}>
            <div>
              <div className={s0.label}>{t('lang')}</div>
              <div>
                <Select
                  options={LANGUAGE_OPTIONS}
                  selected={i18n.language}
                  onChange={(e) => i18n.changeLanguage(e.target.value)}
                />
              </div>
            </div>

            <div>
              <div className={s0.label}>{t('chart_style')}</div>
              <Selection2
                OptionComponent={TrafficChartSample}
                optionPropsList={CONFIG_CHART_STYLE_PROPS}
                selectedIndex={selectedChartStyleIndex}
                onChange={selectChartStyleIndex}
              />
            </div>

            {isMihomo ? null : (
              <div>
                <div className={s0.label}>Yacd</div>
                <VersionLine version={__VERSION__} link={YACD_REPO_URL} />
              </div>
            )}

            <div>
              <div className={s0.label}>
                {t('current_backend')}
                <p>{`${coreMeta.name} ${apiConfig?.baseURL}`}</p>
              </div>
              {!isMihomo && version.version ? (
                <VersionLine version={version.version} link={coreMeta.link} />
              ) : null}
              <Button
                start={<LogOut size={16} />}
                label={t('switch_backend')}
                onClick={openAPIConfigModal}
              />
            </div>

            <div className={s0.fullRow}>
              <TabTitleSettings
                config={tabTitle}
                onChange={(next) => updateAppConfig('tabTitle', next)}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function VersionLine({ version, link }: { version: string; link: string }) {
  return (
    <div className={s0.versionLine}>
      <span className={s0.mono}>{version}</span>
      <a
        className={s0.sourceLink}
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="GitHub"
      >
        <GitHub size={18} />
      </a>
    </div>
  );
}
