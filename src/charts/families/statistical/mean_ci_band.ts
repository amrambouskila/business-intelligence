import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

interface BandRow {
  x: string;
  mean: number;
  lower: number;
  upper: number;
}

function bandRows(data: DataView, config: ChartConfig): BandRow[] {
  const xs = data.columnArrays[config.columns['x']] ?? [];
  const means = data.columnArrays[config.columns['mean']] ?? [];
  const lowers = data.columnArrays[config.columns['lower']] ?? [];
  const uppers = data.columnArrays[config.columns['upper']] ?? [];
  const n = Math.min(xs.length, means.length, lowers.length, uppers.length);
  const rows: BandRow[] = [];

  for (let i = 0; i < n; i++) {
    const mean = means[i];
    const lower = lowers[i];
    const upper = uppers[i];
    if (typeof mean === 'number' && Number.isFinite(mean)
      && typeof lower === 'number' && Number.isFinite(lower)
      && typeof upper === 'number' && Number.isFinite(upper)) {
      rows.push({ x: String(xs[i]), mean, lower, upper });
    }
  }

  return rows;
}

class MeanCiBandRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return bandRows(data, config).length === 0;
  }

  protected emptyMessage(): string {
    return 'No confidence intervals to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const rows = bandRows(data, config);
    const lineColor = categoricalColor(theme.colorScale, 0, theme.foreground);
    const bandColor = categoricalColor(theme.colorScale, 1, theme.gridColor);
    const axes = buildCartesianAxes(
      theme,
      { type: 'category', data: rows.map((r) => r.x) },
      { type: 'value', axisLine: false },
    );

    return {
      tooltip: buildTooltip('axis'),
      xAxis: axes.xAxis,
      yAxis: axes.yAxis,
      series: [
        {
          name: 'Lower',
          type: 'line',
          data: rows.map((r) => r.lower),
          stack: 'ci',
          showSymbol: false,
          lineStyle: { opacity: 0 },
          areaStyle: { opacity: 0 },
        },
        {
          name: 'Interval',
          type: 'line',
          data: rows.map((r) => r.upper - r.lower),
          stack: 'ci',
          showSymbol: false,
          lineStyle: { opacity: 0 },
          areaStyle: { color: bandColor, opacity: 0.25 },
        },
        {
          name: 'Mean',
          type: 'line',
          data: rows.map((r) => r.mean),
          smooth: true,
          itemStyle: { color: lineColor },
          lineStyle: { color: lineColor, width: 2 },
        },
      ],
      grid: buildGrid({ bottom: 50 }),
    };
  }
}

chartRegistry.register({
  type: 'mean_ci_band',
  family: 'statistical',
  name: 'Mean with Confidence Band',
  description: 'Mean estimates over an x dimension with lower/upper confidence band',
  renderer: 'echarts',
  compatibleShapes: ['category_numeric', 'time_series_numeric', 'generic'],
  requiredColumns: [
    { role: 'x', acceptedTypes: ['category', 'text', 'datetime', 'integer', 'float'], label: 'X' },
    { role: 'mean', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Mean' },
    { role: 'lower', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Lower bound' },
    { role: 'upper', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Upper bound' },
  ],
  createRenderer: () => new MeanCiBandRenderer(),
});
