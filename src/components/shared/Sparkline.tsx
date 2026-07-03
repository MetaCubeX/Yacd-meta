import * as React from 'react';
import { Line } from 'react-chartjs-2';

import { chartJSResource, chartStyles, commonDataSetProps } from '~/misc/chart';
import prettyBytes from '~/misc/pretty-bytes';

import s from './Sparkline.module.scss';

const { useMemo } = React;

const extraChartOptions: any = {
  responsive: true,
  maintainAspectRatio: false,
  parsing: false,
  animation: {
    duration: 1000,
    easing: 'linear',
  },
  animations: {
    y: {
      duration: 0,
    },
    x: {
      duration: 0,
    },
  },
  transitions: {
    active: {
      animation: {
        duration: 0,
      },
    },
  },
  plugins: {
    legend: { display: false },
    tooltip: {
      enabled: true,
      intersect: false,
      mode: 'index',
    },
  },
  scales: {
    x: {
      type: 'time',
      display: false,
    },
    y: {
      display: false,
      beginAtZero: true,
    },
  },
  elements: {
    line: {
      borderWidth: 1,
      tension: 0.4,
    },
    point: {
      radius: 0,
    },
  },
};

export default function Sparkline({ data: dataArray, labels, type, styleIndex = 0 }) {
  chartJSResource.read();

  const isMemory = type === 'inuse';

  const options = useMemo(() => {
    return {
      ...extraChartOptions,
      scales: {
        ...extraChartOptions.scales,
        y: {
          display: false,
          // 内存值稳定，不从零开始，让 Y 轴自动适应数据范围以显示波动
          beginAtZero: !isMemory,
        },
      },
      plugins: {
        ...extraChartOptions.plugins,
        tooltip: {
          ...extraChartOptions.plugins.tooltip,
          displayColors: false,
          callbacks: {
            title: () => '',
            label(context) {
              if (context.parsed.y !== null) {
                const suffix = isMemory ? '' : '/s';
                const raw = isMemory ? context.parsed.y : Math.expm1(context.parsed.y);
                return prettyBytes(raw) + suffix;
              }
              return '';
            },
          },
        },
      },
    };
  }, [type, isMemory]);

  const data = useMemo(
    () => ({
      datasets: [
        {
          ...commonDataSetProps,
          ...chartStyles[styleIndex][type],
          // 内存用原始值（变化幅度小，不需要压缩）；流量用 log1p 压缩尖刺
          data: dataArray.map((v, i) => ({ x: labels[i], y: isMemory ? v : Math.log1p(v) })),
          fill: true,
        },
      ],
    }),
    [dataArray, labels, type, styleIndex, isMemory],
  );

  return (
    <div className={s.sparkline}>
      <Line data={data} options={options} redraw={false} />
    </div>
  );
}
