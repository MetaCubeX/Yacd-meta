import * as React from 'react';
import { DownloadCloud, LogOut, RotateCw, Trash2 } from 'react-feather';
import { useTranslation } from 'react-i18next';
import { useQuery } from 'react-query';

import * as logsApi from '~/api/logs';
import { fetchVersion } from '~/api/version';
import Select from '~/components/shared/Select';
import { ClashGeneralConfig, DispatchFn, State } from '~/store/types';
import { ClashAPIConfig } from '~/types';

import { getClashAPIConfig, getLatencyTestUrl, getSelectedChartStyleIndex } from '../store/app';
import {
  fetchConfigs,
  flushFakeIPPool,
  getConfigs,
  reloadConfigFile,
  restartCore,
  updateConfigs,
  updateGeoDatabasesFile,
  upgradeCore,
} from '../store/configs';
import { openModal } from '../store/modals';
import Button from './Button';
import s0 from './Config.module.scss';
import ContentHeader from './ContentHeader';
import Input, { SelfControlledInput } from './Input';
import { Selection2 } from './Selection';
import { connect, useStoreActions } from './StateProvider';
import Switch from './SwitchThemed';
import TrafficChartSample from './TrafficChartSample';

const { useEffect, useState, useCallback, useRef } = React;

const propsList = [{ id: 0 }, { id: 1 }, { id: 2 }, { id: 3 }];

const logLeveOptions = [
  ['debug', 'Debug'],
  ['info', 'Info'],
  ['warning', 'Warning'],
  ['error', 'Error'],
  ['silent', 'Silent'],
];

const portFields = [
  { key: 'port', label: 'Http Port' },
  { key: 'socks-port', label: 'Socks5 Port' },
  { key: 'mixed-port', label: 'Mixed Port' },
  { key: 'redir-port', label: 'Redir Port' },
  { key: 'mitm-port', label: 'MITM Port' },
];

const langOptions = [
  ['zh-cn', '简体中文'],
  ['zh-tw', '繁體中文'],
  ['en', 'English'],
];

const modeOptions = [
  ['direct', 'Direct'],
  ['rule', 'Rule'],
  ['script', 'Script'],
  ['global', 'Global'],
];

const tunStackOptions = [
  ['gvisor', 'gVisor'],
  ['system', 'System'],
  ['lwip', 'LWIP'],
];

const mapState = (s: State) => ({
  configs: getConfigs(s),
  apiConfig: getClashAPIConfig(s),
});

const mapState2 = (s: State) => ({
  selectedChartStyleIndex: getSelectedChartStyleIndex(s),
  latencyTestUrl: getLatencyTestUrl(s),
  apiConfig: getClashAPIConfig(s),
});

const Config = connect(mapState2)(ConfigImpl);
export default connect(mapState)(ConfigContainer);

function ConfigContainer({ dispatch, configs, apiConfig }) {
  useEffect(() => {
    dispatch(fetchConfigs(apiConfig));
  }, [dispatch, apiConfig]);
  return <Config configs={configs} />;
}

type ConfigImplProps = {
  dispatch: DispatchFn;
  configs: ClashGeneralConfig;
  selectedChartStyleIndex: number;
  latencyTestUrl: string;
  apiConfig: ClashAPIConfig;
};

function ConfigImpl({
  dispatch,
  configs,
  selectedChartStyleIndex,
  latencyTestUrl,
  apiConfig,
}: ConfigImplProps) {
  const { t, i18n } = useTranslation();

  const [configState, setConfigStateInternal] = useState(configs);
  const refConfigs = useRef(configs);
  useEffect(() => {
    if (refConfigs.current !== configs) {
      setConfigStateInternal(configs);
    }
    refConfigs.current = configs;
  }, [configs]);

  const openAPIConfigModal = useCallback(() => {
    dispatch(openModal('apiConfig'));
  }, [dispatch]);

  const setConfigState = useCallback(
    (name: string, val: any) => {
      setConfigStateInternal({ ...configState, [name]: val });
    },
    [configState]
  );

  const setTunConfigState = useCallback(
    (name: any, val: any) => {
      const tun = { ...configState.tun, [name]: val };
      setConfigStateInternal({ ...configState, tun: { ...tun } });
    },
    [configState]
  );

  const handleInputOnChange = useCallback(
    ({ name, value }) => {
      switch (name) {
        case 'mode':
        case 'log-level':
        case 'allow-lan':
        case 'sniffing':
          setConfigState(name, value);
          dispatch(updateConfigs(apiConfig, { [name]: value }));
          if (name === 'log-level') {
            logsApi.reconnect({ ...apiConfig, logLevel: value });
          }
          break;
        case 'mitm-port':
        case 'redir-port':
        case 'socks-port':
        case 'mixed-port':
        case 'port':
          if (value !== '') {
            const num = parseInt(value, 10);
            if (num < 0 || num > 65535) return;
          }
          setConfigState(name, value);
          break;
        case 'enable':
        case 'stack':
          setTunConfigState(name, value);
          dispatch(updateConfigs(apiConfig, { tun: { [name]: value } }));
          break;
        default:
          return;
      }
    },
    [apiConfig, dispatch, setConfigState, setTunConfigState]
  );

  const { selectChartStyleIndex, updateAppConfig } = useStoreActions();

  const handleInputOnBlur = useCallback(
    (
      e:
        | React.FocusEvent<HTMLSelectElement | HTMLInputElement>
        | React.ChangeEvent<HTMLSelectElement | HTMLInputElement>
    ) => {
      const { name, value } = e.target;

      switch (name) {
        case 'port':
        case 'socks-port':
        case 'mixed-port':
        case 'redir-port':
        case 'mitm-port': {
          const num = parseInt(value, 10);
          if (num < 0 || num > 65535) return;
          dispatch(updateConfigs(apiConfig, { [name]: num }));
          break;
        }
        case 'latencyTestUrl': {
          updateAppConfig(name, value);
          break;
        }
        case 'device name':
        case 'interface name':
          break;
        default:
          throw new Error(`unknown input name ${name}`);
      }
    },
    [apiConfig, dispatch, updateAppConfig]
  );
  const handleReloadConfigFile = useCallback(() => {
    dispatch(reloadConfigFile(apiConfig));
  }, [apiConfig, dispatch]);

  const handleRestartCore = useCallback(() => {
    dispatch(restartCore(apiConfig));
  }, [apiConfig, dispatch]);

  const handleUpgradeCore = useCallback(() => {
    dispatch(upgradeCore(apiConfig));
  }, [apiConfig, dispatch]);

  const handleUpdateGeoDatabasesFile = useCallback(() => {
    dispatch(updateGeoDatabasesFile(apiConfig));
  }, [apiConfig, dispatch]);

  const handleFlushFakeIPPool = useCallback(() => {
    dispatch(flushFakeIPPool(apiConfig));
  }, [apiConfig, dispatch]);

  const { data: version } = useQuery(['/version', apiConfig], () =>
    fetchVersion('/version', apiConfig)
  );

  return (
    <div>
      <ContentHeader title={t('Config')} />
      <div className={s0.root}>
        {portFields.map((f) =>
          configState[f.key] !== undefined ? (
            <div key={f.key}>
              <div className={s0.label}>{f.label}</div>
              <Input
                name={f.key}
                value={configState[f.key]}
                onChange={({ target: { name, value } }) => handleInputOnChange({ name, value })}
                onBlur={handleInputOnBlur}
              />
            </div>
          ) : null
        )}

        <div>
          <div className={s0.label}>Mode</div>
          <Select
            options={modeOptions}
            selected={configState.mode.toLowerCase()}
            onChange={(e) => handleInputOnChange({ name: 'mode', value: e.target.value })}
          />
        </div>

        <div>
          <div className={s0.label}>Log Level</div>
          <Select
            options={logLeveOptions}
            selected={configState['log-level'].toLowerCase()}
            onChange={(e) => handleInputOnChange({ name: 'log-level', value: e.target.value })}
          />
        </div>

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
        {version.meta && (
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
      <div className={s0.sep}>
        <div />
      </div>
      {version.meta && (
        <>
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
                options={tunStackOptions}
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
          <div className={s0.sep}>
            <div />
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
            <div>
              <div className={s0.label}>GEO Databases</div>
              <Button
                start={<DownloadCloud size={16} />}
                label={t('update_geo_databases_file')}
                onClick={handleUpdateGeoDatabasesFile}
              />
            </div>
            <div>
              <div className={s0.label}>FakeIP</div>
              <Button
                start={<Trash2 size={16} />}
                label={t('flush_fake_ip_pool')}
                onClick={handleFlushFakeIPPool}
              />
            </div>
            <div>
              <div className={s0.label}>Restart</div>
              <Button
                start={<RotateCw size={16} />}
                label={t('restart_core')}
                onClick={handleRestartCore}
              />
            </div>
            <div>
              <div className={s0.label}>⚠️ Upgrade ⚠️</div>
              <Button
                start={<RotateCw size={16} />}
                label={t('upgrade_core')}
                onClick={handleUpgradeCore}
              />
            </div>
          </div>
          <div className={s0.sep}>
            <div />
          </div>
        </>
      )}

      <div className={s0.section}>
        <div>
          <div className={s0.label}>{t('latency_test_url')}</div>
          <SelfControlledInput
            name="latencyTestUrl"
            type="text"
            value={latencyTestUrl}
            onBlur={handleInputOnBlur}
          />
        </div>
        <div>
          <div className={s0.label}>{t('lang')}</div>
          <div>
            <Select
              options={langOptions}
              selected={i18n.language}
              onChange={(e) => i18n.changeLanguage(e.target.value)}
            />
          </div>
        </div>

        <div>
          <div className={s0.label}>{t('chart_style')}</div>
          <Selection2
            OptionComponent={TrafficChartSample}
            optionPropsList={propsList}
            selectedIndex={selectedChartStyleIndex}
            onChange={selectChartStyleIndex}
          />
        </div>

        <div>
          <div className={s0.label}>Action</div>
          <Button
            start={<LogOut size={16} />}
            label="Switch backend"
            onClick={openAPIConfigModal}
          />
        </div>
      </div>
    </div>
  );
}
