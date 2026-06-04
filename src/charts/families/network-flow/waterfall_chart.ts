import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

interface WaterfallPoint {
  step: string;
  delta: number;
  base: number;
  end: number;
}

function buildWaterfall(data: DataView, config: ChartConfig): WaterfallPoint[] {
  const steps = data.columnArrays[config.columns['step']] ?? [];
  const deltas = data.columnArrays[config.columns['delta']] ?? [];
  let running = 0;
  const points: WaterfallPoint[] = [];
  for (let i = 0; i < steps.length; i++) {
    const delta = deltas[i];
    if (typeof delta !== 'number' || !Number.isFinite(delta)) continue;
    const next = running + delta;
    points.push({
      step: String(steps[i]),
      delta,
      base: Math.min(running, next),
      end: next,
    });
    running = next;
  }
  return points;
}

class WaterfallChartRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return buildWaterfall(data, config).length === 0;
  }

  protected emptyMessage(): string {
    return 'No deltas to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const points = buildWaterfall(data, config);
    const axes = buildCartesianAxes(
      theme,
      { type: 'category', data: points.map((p) => p.step) },
      { type: 'value', name: 'Cumulative value', axisLine: false },
    );

    return {
      tooltip: buildTooltip('axis'),
      grid: buildGrid(),
      xAxis: axes.xAxis,
      yAxis: axes.yAxis,
      series: [
        {
          name: 'Base',
          type: 'bar',
          stack: 'total',
          itemStyle: { color: 'transparent' },
          emphasis: { disabled: true },
          data: points.map((p) => p.base),
        },
        {
          name: 'Delta',
          type: 'bar',
          stack: 'total',
          data: points.map((p) => ({
            value: Math.abs(p.delta),
            itemStyle: { color: p.delta >= 0 ? categoricalColor(theme.colorScale, 0, theme.foreground) : categoricalColor(theme.colorScale, 1, theme.foreground) },
          })),
        },
        {
          name: 'Running total',
          type: 'line',
          data: points.map((p) => p.end),
          symbolSize: 6,
          itemStyle: { color: categoricalColor(theme.colorScale, 2, theme.foreground) },
          lineStyle: { color: categoricalColor(theme.colorScale, 2, theme.foreground), width: 2 },
        },
      ],
    };
  }
}

chartRegistry.register({
  type: 'waterfall_chart',
  family: 'network-flow',
  name: 'Waterfall Chart',
  description: 'Sequential positive and negative contributions to a running total',
  renderer: 'echarts',
  compatibleShapes: ['category_numeric', 'generic'],
  requiredColumns: [
    { role: 'step', acceptedTypes: ['category', 'text'], label: 'Step' },
    { role: 'delta', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Delta' },
  ],
  createRenderer: () => new WaterfallChartRenderer(),
});
