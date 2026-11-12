import { useTranslation } from 'react-i18next';

import { ClashAPIConfig } from '~/types';

import s from './Home.module.scss';
import MemoryCard from './MemoryCard';
import StatCards from './StatCards';
import TrafficCard from './TrafficCard';

type Props = {
  apiConfig: ClashAPIConfig;
  selectedChartStyleIndex: number;
};

export default function Home({ apiConfig, selectedChartStyleIndex }: Props) {
  const { t } = useTranslation();

  return (
    <div className={s.page}>
      <header className={s.pageHeader}>
        <h1 className={s.pageTitle}>{t('Overview')}</h1>
      </header>
      <div className={s.grid}>
        <StatCards apiConfig={apiConfig} selectedChartStyleIndex={selectedChartStyleIndex} />
        <TrafficCard apiConfig={apiConfig} selectedChartStyleIndex={selectedChartStyleIndex} />
        <MemoryCard apiConfig={apiConfig} selectedChartStyleIndex={selectedChartStyleIndex} />
      </div>
    </div>
  );
}
