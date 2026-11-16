import { useTranslation } from 'react-i18next';

import { SkeletonText } from '~/components/shared/Skeleton';
import { chartStyles } from '~/misc/chart';
import { useConnectionSummary } from '~/modules/home/hooks';
import { formatCount, splitBytes } from '~/modules/home/utils';
import { ClashAPIConfig } from '~/types';

import s from './Home.module.scss';

type Props = {
  apiConfig: ClashAPIConfig;
  selectedChartStyleIndex: number;
};

type StatCardProps = {
  label: string;
  value: string;
  unit: string;
  meta: string;
  dotColor: string;
  isLoading: boolean;
};

function StatCard({ label, value, unit, meta, dotColor, isLoading }: StatCardProps) {
  return (
    <section className={s.card}>
      <span className={s.cardLabel}>{label}</span>
      <div className={s.value}>
        {isLoading ? (
          <SkeletonText width={112} className={s.valueSkeleton} />
        ) : (
          <>
            <span>{value}</span>
            <em className={s.unit}>{unit}</em>
          </>
        )}
      </div>
      <div className={s.meta}>
        <span className={s.dot} style={{ backgroundColor: dotColor }} />
        <span>{meta}</span>
      </div>
    </section>
  );
}

export default function StatCards({ apiConfig, selectedChartStyleIndex }: Props) {
  const { t } = useTranslation();
  const { isLoading, upTotal, dlTotal, connNumber, tcpNumber, udpNumber } =
    useConnectionSummary(apiConfig);
  const style = chartStyles[selectedChartStyleIndex] || chartStyles[0];

  const dl = splitBytes(dlTotal);
  const up = splitBytes(upTotal);

  return (
    <>
      <StatCard
        label={t('Download Total')}
        value={dl.value}
        unit={dl.unit}
        meta={t('since_core_start')}
        dotColor={style.down.borderColor}
        isLoading={isLoading}
      />
      <StatCard
        label={t('Upload Total')}
        value={up.value}
        unit={up.unit}
        meta={t('since_core_start')}
        dotColor={style.up.borderColor}
        isLoading={isLoading}
      />
      <StatCard
        label={t('Active Connections')}
        value={formatCount(connNumber)}
        unit={t('conn_unit')}
        meta={isLoading ? '' : `TCP ${formatCount(tcpNumber)} · UDP ${formatCount(udpNumber)}`}
        dotColor="#22c55e"
        isLoading={isLoading}
      />
    </>
  );
}
