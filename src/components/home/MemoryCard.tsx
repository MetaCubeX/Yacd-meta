import { Suspense } from 'react';
import { useTranslation } from 'react-i18next';

import { Skeleton, SkeletonText } from '~/components/shared/Skeleton';
import prettyBytes from '~/misc/pretty-bytes';
import { CHART_WINDOW, useMemory, useRulesCount } from '~/modules/home/hooks';
import { formatCount, hasSample, latestOf, peakOf, splitBytes } from '~/modules/home/utils';
import { ClashAPIConfig } from '~/types';

import s from './Home.module.scss';
import MemoryChart from './MemoryChart';

type Props = {
  apiConfig: ClashAPIConfig;
  selectedChartStyleIndex: number;
};

export default function MemoryCard({ apiConfig, selectedChartStyleIndex }: Props) {
  const { t } = useTranslation();
  const memory = useMemory(apiConfig);
  const rulesCount = useRulesCount(apiConfig);

  const { value, unit } = splitBytes(latestOf(memory.inuse));
  const peak = peakOf(memory.inuse, CHART_WINDOW);
  const isLoading = !hasSample(memory.inuse);

  return (
    <section className={s.card}>
      <h2 className={s.cardTitle}>{t('Memory Usage')}</h2>
      <p className={s.cardSubtitle}>{t('current_process_memory')}</p>
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
      <div className={s.memoryChart}>
        {isLoading ? (
          <Skeleton height="100%" radius={8} />
        ) : (
          <Suspense fallback={<Skeleton height="100%" radius={8} />}>
            <MemoryChart memory={memory} styleIndex={selectedChartStyleIndex} />
          </Suspense>
        )}
      </div>
      <div className={s.metaRows}>
        <div className={s.metaRow}>
          <span>{t('memory_peak')}</span>
          {isLoading ? (
            <SkeletonText width={56} />
          ) : (
            <span className={s.metaValue}>{prettyBytes(peak)}</span>
          )}
        </div>
        <div className={s.metaRow}>
          <span>{t('rule_count')}</span>
          {rulesCount === undefined ? (
            <SkeletonText width={40} />
          ) : (
            <span className={s.metaValue}>{formatCount(rulesCount)}</span>
          )}
        </div>
      </div>
    </section>
  );
}
