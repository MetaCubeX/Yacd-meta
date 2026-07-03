import * as React from 'react';
import { Line } from 'react-chartjs-2';

import { chartJSResource, chartStyles, commonDataSetProps } from '~/misc/chart';

const { useMemo } = React;

const extraChartOptions: import('chart.js').ChartOptions<'line'> = {
  responsive: true,
  maintainAspectRatio: false,
  animation: false,
  plugins: {
    legend: { display: false },
    tooltip: { enabled: false },
  },
  scales: {
    x: { display: false, type: 'category' },
    y: { display: false },
  },
};

const data1 = [23e3, 35e3, 46e3, 33e3, 90e3, 68e3, 23e3, 45e3];
const data2 = [184e3, 183e3, 196e3, 182e3, 190e3, 186e3, 182e3, 189e3];
const labels = data1.map((_, i) => i);

export default function TrafficChart({ id }) {
  chartJSResource.read();

  const data = useMemo(
    () => ({
      labels,
      datasets: [
        {
          ...commonDataSetProps,
          ...chartStyles[id].up,
          data: data1,
        },
        {
          ...commonDataSetProps,
          ...chartStyles[id].down,
          data: data2,
        },
      ],
    }),
    [id]
  );

  return (
    <div style={{ width: 80, height: 40, padding: 5 }}>
      <Line data={data} options={extraChartOptions} />
    </div>
  );
}
