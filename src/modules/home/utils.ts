import prettyBytes from '~/misc/pretty-bytes';

export function formatTrafficRate(value: number) {
  return `${prettyBytes(value || 0)}/s`;
}

type ValueWithUnit = { value: string; unit: string };

/** 把 "17.6 GB" 拆成数值和单位，方便大号数字 + 小号单位的排版 */
export function splitBytes(value: number): ValueWithUnit {
  const [num, unit] = prettyBytes(value || 0).split(' ');
  return { value: num, unit };
}

/** 同 splitBytes，但单位带 /s 后缀 */
export function splitTrafficRate(value: number): ValueWithUnit {
  const { value: num, unit } = splitBytes(value);
  return { value: num, unit: `${unit}/s` };
}

/** 数量千分位，例如 1248 -> 1,248 */
export function formatCount(value: number) {
  return (value || 0).toLocaleString();
}

/** 把 chart.js 配色里的 rgb()/rgba() 颜色换成指定透明度 */
export function withAlpha(color: string, alpha: number) {
  const matched = color.match(/rgba?\(([^)]+)\)/);
  if (!matched) return color;
  const [r, g, b] = matched[1].split(',').map((x) => parseFloat(x));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** 自上而下渐隐的填充色，渐变对象按绘图区尺寸缓存，避免逐帧重建 */
export function gradientFill(color: string) {
  let cached: { top: number; bottom: number; value: CanvasGradient } | null = null;
  return (context: any) => {
    const { ctx, chartArea } = context.chart;
    if (!chartArea) return withAlpha(color, 0.18);
    const { top, bottom } = chartArea;
    if (!cached || cached.top !== top || cached.bottom !== bottom) {
      const value = ctx.createLinearGradient(0, top, 0, bottom);
      value.addColorStop(0, withAlpha(color, 0.35));
      value.addColorStop(1, withAlpha(color, 0.02));
      cached = { top, bottom, value };
    }
    return cached.value;
  };
}

/** 采样缓冲里未填充的位置是 null，内核首帧还会推一个 0，都当作没有数据 */
const isSample = (v: number) => v > 0;

/** 末尾 count 个采样点里的最大值 */
export function peakOf(values: number[], count: number) {
  let peak = 0;
  for (let i = Math.max(0, values.length - count); i < values.length; i++) {
    if (isSample(values[i]) && values[i] > peak) peak = values[i];
  }
  return peak;
}

/** 末尾 count 个采样点的取值区间，两端留出 padRatio 的余量 */
export function rangeOf(values: number[], count: number, padRatio: number) {
  let min = Infinity;
  let max = 0;
  for (let i = Math.max(0, values.length - count); i < values.length; i++) {
    const v = values[i];
    if (!isSample(v)) continue;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (max === 0) return { min: 0, max: 1 };
  // 数值本身很平稳时，余量取值的百分比，免得把细微噪声放大成剧烈起伏
  const pad = Math.max((max - min) * 0.5, max * padRatio);
  return { min: Math.max(0, min - pad), max: max + pad };
}

/** 末尾一个有效采样点 */
/** 窗口里是否已有推送来的数据。窗口按时间顺序追加，看最后一格就够了 */
export function hasSample(values: number[]) {
  return isSample(values[values.length - 1]);
}

export function latestOf(values: number[]) {
  for (let i = values.length - 1; i >= 0; i--) {
    if (isSample(values[i])) return values[i];
  }
  return 0;
}
