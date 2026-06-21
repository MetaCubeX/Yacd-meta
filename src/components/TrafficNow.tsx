import * as React from 'react';
import { useTranslation } from 'react-i18next';

import {
  Download,
  ArrowDown,
  ArrowUp,
  Cpu,
  Link as LinkIcon,
  Upload,
} from '~/components/shared/FeatherIcons';

import useMemory from '../hooks/useMemory';
import useTraffic from '../hooks/useTraffic';
import { useConnectionSummary } from '../modules/home/hooks';
import { formatTrafficRate } from '../modules/home/utils';
import { ClashAPIConfig } from '../types';

import Sparkline from './Sparkline';
import s0 from './TrafficNow.module.scss';

type Props = {
  apiConfig: ClashAPIConfig;
  selectedChartStyleIndex: number;
};

export default function TrafficNow({ apiConfig, selectedChartStyleIndex }: Props) {
  const { t } = useTranslation();
  const traffic = useTraffic(apiConfig);
  const memory = useMemory(apiConfig);
  const { upTotal, dlTotal, connNumber, mUsage } = useConnectionSummary(apiConfig);

  const upStr = formatTrafficRate(traffic.up[traffic.up.length - 1] || 0);
  const downStr = formatTrafficRate(traffic.down[traffic.down.length - 1] || 0);

  return (
    <div className={s0.TrafficNow}>
      <div className={s0.overview}>
        <div className={s0.sec}>
          <div className={s0.header}>
            <Download size={16} />
            <span>{t('Download Total')}</span>
          </div>
          <div className={s0.value}>{dlTotal}</div>
        </div>
        <div className={s0.sec}>
          <div className={s0.header}>
            <Upload size={16} />
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

      <div className={s0.chartsRow}>
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
    </div>
  );
}
