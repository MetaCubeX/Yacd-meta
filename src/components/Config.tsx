import * as React from 'react';
import {
  Cpu,
  DownloadCloud,
  LogOut,
  Monitor,
  RotateCw,
  Settings,
  Tool,
  Trash2,
} from '~/components/shared/FeatherIcons';
import { useTranslation } from 'react-i18next';

import Select from '~/components/shared/Select';
import { useConfigPage } from '~/modules/config/hooks';
import {
  CONFIG_CHART_STYLE_PROPS,
  getBackendContent,
  LANGUAGE_OPTIONS,
  LOG_LEVEL_OPTIONS,
  MODE_OPTIONS,
  PORT_FIELDS,
  TUN_STACK_OPTIONS,
} from '~/modules/config/utils';
import { ClashGeneralConfig, DispatchFn } from '~/store/types';
import { ClashAPIConfig } from '~/types';

import Button from './Button';
import s0 from './Config.module.scss';
import ContentHeader from './ContentHeader';
import Input, { SelfControlledInput } from './Input';
import { Selection2 } from './Selection';
import { useStoreActions } from './StateProvider';
import Switch from './SwitchThemed';
import TrafficChartSample from './TrafficChartSample';

type Props = {
  dispatch: DispatchFn;
  configs: ClashGeneralConfig;
  selectedChartStyleIndex: number;
  apiConfig: ClashAPIConfig;
};

export default function Config({
  dispatch,
  configs,
  selectedChartStyleIndex,
  apiConfig,
}: Props) {
  const { t, i18n } = useTranslation();

  const { selectChartStyleIndex, updateAppConfig } = useStoreActions();
  const {
    configState,
    openAPIConfigModal,
    handleInputOnChange,
    handleInputOnBlur,
    handleReloadConfigFile,
    handleRestartCore,
    handleUpgradeCore,
    handleUpgradeGeo,
    handleUpgradeUI,
    handleFlushFakeIPPool,
    versionQuery: { data: version },
  } = useConfigPage({
    apiConfig,
    configs,
    dispatch,
    updateAppConfig,
  });

  return (
    <div>
      <div className={s0.root}>
        <div className={s0.card}>
          <div className={s0.sectionTitle}>
            <Settings size={20} />
            {t('general')}
          </div>
          <div className={s0.section}>
            {(version.meta && version.premium) ||
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
                ) : null
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

            {(version.meta && version.premium) || (
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

            {version.meta && !version.premium && (
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

        {version.meta && (
          <>
            {version.premium || (
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
                      onChange={(e) =>
                        handleInputOnChange({ name: 'stack', value: e.target.value })
                      }
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
                <div>
                  <div className={s0.label}>Reload</div>
                  <Button
                    start={<RotateCw size={16} />}
                    label={t('reload_config_file')}
                    onClick={handleReloadConfigFile}
                  />
                </div>
                {version.meta && !version.premium && (
                  <div>
                    <div className={s0.label}>GEO Databases</div>
                    <Button
                      start={<DownloadCloud size={16} />}
                      label={t('upgrade_geo')}
                      onClick={handleUpgradeGeo}
                    />
                  </div>
                )}
                {version.meta && !version.premium && (
                  <div>
                    <div className={s0.label}>Dashboard UI</div>
                    <Button
                      start={<DownloadCloud size={16} />}
                      label={t('upgrade_ui')}
                      onClick={handleUpgradeUI}
                    />
                  </div>
                )}
                <div>
                  <div className={s0.label}>FakeIP</div>
                  <Button
                    start={<Trash2 size={16} />}
                    label={t('flush_fake_ip_pool')}
                    onClick={handleFlushFakeIPPool}
                  />
                </div>
                {version.meta && !version.premium && (
                  <div>
                    <div className={s0.label}>Restart</div>
                    <Button
                      start={<RotateCw size={16} />}
                      label={t('restart_core')}
                      onClick={handleRestartCore}
                    />
                  </div>
                )}
                {version.meta && !version.premium && (
                  <div>
                    <div className={s0.label}>⚠️ Upgrade ⚠️</div>
                    <Button
                      start={<RotateCw size={16} />}
                      label={t('upgrade_core')}
                      onClick={handleUpgradeCore}
                    />
                  </div>
                )}
              </div>
            </div>
          </>
        )}

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

            <div>
              <div className={s0.label}>
                {t('current_backend')}
                <p>{getBackendContent(version) + apiConfig?.baseURL}</p>
              </div>
              <div className={s0.label}>Action</div>
              <Button
                start={<LogOut size={16} />}
                label={t('switch_backend')}
                onClick={openAPIConfigModal}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
