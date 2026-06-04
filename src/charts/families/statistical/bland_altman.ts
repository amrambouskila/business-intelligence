import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

interface BlandAltmanPoint {
  mean: number;
  diff: number;
}

function blandAltmanPoints(data: DataView, config: ChartConfig): BlandAltmanPoint[] {
  const aValues = data.columnArrays[config.columns['measure_a']] ?? [];
  const bValues = data.columnArrays[config.columns['measure_b']] ?? [];
  const n = Math.min(aValues.length, bValues.length);
  const points: BlandAltmanPoint[] = [];

  for (let i = 0; i < n; i++) {
    const a = aValues[i];
    const b = bValues[i];
    if (typeof a === 'number' && Number.isFinite(a) && typeof b === 'number' && Number.isFinite(b)) {
      points.push({ mean: (a + b) / 2, diff: b - a });
    }
  }

  return points;
}

function mean(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function sampleStd(values: number[], center: number): number {
  if (values.length < 2) return 0;
  const variance = values.reduce((sum, v) => sum + (v - center) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

class BlandAltmanRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return blandAltmanPoints(data, config).length === 0;
  }

  protected emptyMessage(): string {
    return 'No paired measures to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const points = blandAltmanPoints(data, config);
    const diffs = points.map((p) => p.diff);
    const bias = mean(diffs);
    const sd = sampleStd(diffs, bias);
    const upper = bias + 1.96 * sd;
    const lower = bias - 1.96 * sd;
    const means = points.map((p) => p.mean);
    const minX = Math.min(...means);
    const maxX = Math.max(...means);
    const color = categoricalColor(theme.colorScale, 0, theme.foreground);

    const axes = buildCartesianAxes(
      theme,
      { type: 'value', name: 'Mean', nameGap: 30 },
      { type: 'value', name: 'Difference', nameGap: 40, axisLine: false },
    );

    return {
      tooltip: buildTooltip('item'),
      xAxis: axes.xAxis,
      yAxis: axes.yAxis,
      series: [
        {
          type: 'scatter',
          data: points.map((p) => [p.mean, p.diff]),
          itemStyle: { color },
        },
        {
          name: 'Bias',
          type: 'line',
          data: [[minX, bias], [maxX, bias]],
          showSymbol: false,
          lineStyle: { color: theme.gridColor, type: 'solid' },
        },
        {
          name: 'Upper LOA',
          type: 'line',
          data: [[minX, upper], [maxX, upper]],
          showSymbol: false,
          lineStyle: { color: theme.gridColor, type: 'dashed' },
        },
        {
          name: 'Lower LOA',
          type: 'line',
          data: [[minX, lower], [maxX, lower]],
          showSymbol: false,
          lineStyle: { color: theme.gridColor, type: 'dashed' },
        },
      ],
      grid: buildGrid({ bottom: 50 }),
    };
  }
}

chartRegistry.register({
  type: 'bland_altman',
  family: 'statistical',
  name: 'Bland-Altman Plot',
  description: 'Mean-difference plot for paired measurement agreement',
  renderer: 'echarts',
  compatibleShapes: ['two_numeric', 'generic'],
  requiredColumns: [
    { role: 'measure_a', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Measure A' },
    { role: 'measure_b', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Measure B' },
  ],
  createRenderer: () => new BlandAltmanRenderer(),
});
