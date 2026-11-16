import { useQuery } from '@tanstack/react-query';
import * as React from 'react';

import * as connAPI from '~/api/connections';
import type { ConnectionsData } from '~/api/connections';
import { fetchData as fetchMemory } from '~/api/memory';
import { fetchRules } from '~/api/rules';
import { fetchData as fetchTraffic } from '~/api/traffic';
import { ClashAPIConfig } from '~/types';

const { useCallback, useEffect, useRef, useState } = React;

/** 图表窗口长度（秒），后端每秒推送一帧 */
export const CHART_WINDOW = 60;

/**
 * 可视窗口比当前时刻滞后一个推送周期。最新的点始终落在右边缘之外，
 * 曲线右端永远是满的，不会因为推送早到晚到而出现忽长忽短的缺口。
 */
const RENDER_DELAY = 1000;

/** 纵轴量程每帧向目标值靠拢的比例，越小越跟手 */
const Y_EASING = 0.08;

type Range = { min: number; max: number };

/**
 * 让图表按「坐标轴窗口逐帧前进」的方式滚动。
 *
 * 滑动窗口里索引 i 的像素位置是固定的，所以让元素做补间只会让曲线原地起伏（果冻感）。
 * 这里改成关掉元素动画、每帧把 x 轴推到「此刻往前 CHART_WINDOW 秒」，
 * 数据点按各自的时间戳定位，曲线就是匀速左移。纵轴量程用指数缓动跟随
 * getRange()，出现尖峰时是平滑缩放而不是整条曲线瞬移。
 */
export function useScrollingChart(chartRef: React.RefObject<any>, getRange: () => Range) {
  const getRangeRef = useRef(getRange);
  getRangeRef.current = getRange;

  useEffect(() => {
    let raf = 0;
    let shown: Range | null = null;

    const frame = () => {
      raf = requestAnimationFrame(frame);
      const chart = chartRef.current;
      if (!chart) return;

      const target = getRangeRef.current();
      // 首帧直接落到目标量程，避免开局曲线从零“长”出来
      shown = shown
        ? {
            min: shown.min + (target.min - shown.min) * Y_EASING,
            max: shown.max + (target.max - shown.max) * Y_EASING,
          }
        : target;

      const xMax = Date.now() - RENDER_DELAY;
      const { x, y } = chart.options.scales;
      x.min = xMax - CHART_WINDOW * 1000;
      x.max = xMax;
      y.min = shown.min;
      y.max = shown.max;
      chart.update('none');
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [chartRef]);
}

type ConnectionSummary = {
  /** 首条消息到达前为 true，其余字段此时都是 0 */
  isLoading: boolean;
  /** 自内核启动累计上传，单位 byte */
  upTotal: number;
  /** 自内核启动累计下载，单位 byte */
  dlTotal: number;
  connNumber: number;
  tcpNumber: number;
  udpNumber: number;
};

const initialSummary: ConnectionSummary = {
  isLoading: true,
  upTotal: 0,
  dlTotal: 0,
  connNumber: 0,
  tcpNumber: 0,
  udpNumber: 0,
};

export function useConnectionSummary(apiConfig: ClashAPIConfig): ConnectionSummary {
  const [state, setState] = useState(initialSummary);

  const read = useCallback(({ downloadTotal, uploadTotal, connections }: ConnectionsData) => {
    let tcpNumber = 0;
    let udpNumber = 0;
    for (const conn of connections || []) {
      if (conn.metadata?.network === 'udp') {
        udpNumber += 1;
      } else {
        tcpNumber += 1;
      }
    }
    setState({
      isLoading: false,
      upTotal: uploadTotal || 0,
      dlTotal: downloadTotal || 0,
      connNumber: connections ? connections.length : 0,
      tcpNumber,
      udpNumber,
    });
  }, []);

  useEffect(() => {
    return connAPI.fetchData(apiConfig, read, () => {
      /* noop */
    });
  }, [apiConfig, read]);

  return state;
}

/** 规则条数，和规则页共用同一份缓存。请求完成前返回 undefined */
export function useRulesCount(apiConfig: ClashAPIConfig): number | undefined {
  const { data } = useQuery({
    queryKey: ['/rules', apiConfig],
    queryFn: () => fetchRules('/rules', apiConfig),
  });
  return data?.length;
}

/** 流量曲线：订阅 /traffic 的共享数据源，每次推送把窗口内的数组复制出来触发渲染 */
export function useTraffic(apiConfig: ClashAPIConfig) {
  const traffic = fetchTraffic(apiConfig);
  const [data, setData] = useState({
    up: [...traffic.up],
    down: [...traffic.down],
    labels: [...traffic.labels],
  });

  useEffect(() => {
    return traffic.subscribe(() => {
      setData({
        up: [...traffic.up],
        down: [...traffic.down],
        labels: [...traffic.labels],
      });
    });
  }, [traffic]);

  return data;
}

/** 内存曲线，同 useTraffic */
export function useMemory(apiConfig: ClashAPIConfig) {
  const memory = fetchMemory(apiConfig);
  const [data, setData] = useState({
    inuse: [...memory.inuse],
    oslimit: [...memory.oslimit],
    labels: [...memory.labels],
  });

  useEffect(() => {
    return memory.subscribe(() => {
      setData({
        inuse: [...memory.inuse],
        oslimit: [...memory.oslimit],
        labels: [...memory.labels],
      });
    });
  }, [memory]);

  return data;
}
