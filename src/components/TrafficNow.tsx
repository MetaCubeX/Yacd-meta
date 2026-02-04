import * as React from 'react';
import { Activity, ArrowDown, ArrowUp, Cpu, Link as LinkIcon, Zap } from 'react-feather';
import { useTranslation } from 'react-i18next';

import * as connAPI from '../api/connections';
import useMemory from '../hooks/useMemory';
import useTraffic from '../hooks/useTraffic';
import prettyBytes from '../misc/pretty-bytes';
import { getClashAPIConfig, getSelectedChartStyleIndex } from '../store/app';
import Sparkline from './Sparkline';
import { connect } from './StateProvider';
import s0 from './TrafficNow.module.scss';

const { useState, useEffect, useCallback } = React;

const mapState = (s) => ({
  apiConfig: getClashAPIConfig(s),
  selectedChartStyleIndex: getSelectedChartStyleIndex(s),
});
export default connect(mapState)(TrafficNow);

function TrafficNow({ apiConfig, selectedChartStyleIndex }) {
  const { t } = useTranslation();
  const traffic = useTraffic(apiConfig);
  const memory = useMemory(apiConfig);
  const { upTotal, dlTotal, connNumber, mUsage } = useConnection(apiConfig);

  const upStr = prettyBytes(traffic.up[traffic.up.length - 1] || 0) + '/s';
  const downStr = prettyBytes(traffic.down[traffic.down.length - 1] || 0) + '/s';

  return (
    <div className={s0.TrafficNow}>
      <div className={s0.overview}>
        <div className={s0.sec}>
          <div className={s0.header}>
            <Activity size={16} />
            <span>{t('Download Total')}</span>
          </div>
          <div className={s0.value}>{dlTotal}</div>
        </div>
        <div className={s0.sec}>
          <div className={s0.header}>
            <Zap size={16} />
            <span>{t('Upload Total')}</span>
          </div>
          <div className={s0.value}>{upTotal}</div>
        </div>
        <div className={s0.sec}>
          <div className={s0.header}>
            <LinkIcon size={16} />
            <span>{t('Active Connections')}</span>
          </div>
          <div className={s0.value}>{connNumber}</div>
        </div>
      </div>

      <div className={s0.sec}>
        <div className={s0.header}>
          <ArrowDown size={16} />
          <span>{t('Download')}</span>
        </div>
        <div className={s0.value}>{downStr}</div>
        <Sparkline
          data={traffic.down}
          labels={traffic.labels}
          type="down"
          styleIndex={selectedChartStyleIndex}
        />
      </div>
      <div className={s0.sec}>
        <div className={s0.header}>
          <ArrowUp size={16} />
          <span>{t('Upload')}</span>
        </div>
        <div className={s0.value}>{upStr}</div>
        <Sparkline
          data={traffic.up}
          labels={traffic.labels}
          type="up"
          styleIndex={selectedChartStyleIndex}
        />
      </div>

      <div className={s0.sec}>
        <div className={s0.header}>
          <Cpu size={16} />
          <span>{t('Memory Usage')}</span>
        </div>
        <div className={s0.value}>{mUsage}</div>
        <Sparkline
          data={memory.inuse}
          labels={memory.labels}
          type="inuse"
          styleIndex={selectedChartStyleIndex}
        />
      </div>
    </div>
  );
}

function useConnection(apiConfig) {
  const [state, setState] = useState({
    upTotal: '0 B',
    dlTotal: '0 B',
    connNumber: 0,
    mUsage: '0 B',
  });
  const read = useCallback(
    ({ downloadTotal, uploadTotal, connections, memory }) => {
      setState({
        upTotal: prettyBytes(uploadTotal),
        dlTotal: prettyBytes(downloadTotal),
        connNumber: connections ? connections.length : 0,
        mUsage: prettyBytes(memory),
      });
    },
    [setState]
  );
  useEffect(() => {
    return connAPI.fetchData(apiConfig, read, () => {
      /* noop */
    });
  }, [apiConfig, read]);
  return state;
}
