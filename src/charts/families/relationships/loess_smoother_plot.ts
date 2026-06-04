import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

type Point = [number, number];

function finitePoints(data: DataView, config: ChartConfig): Point[] {
  const xs = data.columnArrays[config.columns['x']] ?? [];
  const ys = data.columnArrays[config.columns['y']] ?? [];
  const points: Point[] = [];
  for (let i = 0; i < Math.min(xs.length, ys.length); i++) {
    const x = xs[i];
    const y = ys[i];
    if (typeof x === 'number' && typeof y === 'number' && Number.isFinite(x) && Number.isFinite(y)) {
      points.push([x, y]);
    }
  }
  return points.sort((a, b) => a[0] - b[0]);
}

function smooth(points: Point[]): Point[] {
  if (points.length === 0) return [];
  const radius = Math.max(1, Math.floor(Math.sqrt(points.length) / 2));
  return points.map(([x], index) => {
    const from = Math.max(0, index - radius);
    const to = Math.min(points.length, index + radius + 1);
    let total = 0;
    for (let i = from; i < to; i++) total += points[i][1];
    return [x, total / (to - from)] as Point;
  });
}

class LoessSmootherPlotRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return finitePoints(data, config).length === 0;
  }

  protected emptyMessage(): string {
    return 'No x/y points to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const points = finitePoints(data, config);
    const axes = buildCartesianAxes(
      theme,
      { type: 'value', name: config.columns['x'], nameGap: 30 },
      { type: 'value', name: config.columns['y'], nameGap: 40, axisLine: false },
    );
    const pointColor = categoricalColor(theme.colorScale, 0, theme.foreground);
    const lineColor = categoricalColor(theme.colorScale, 1, theme.foreground);

    return {
      tooltip: buildTooltip('item'),
      xAxis: axes.xAxis,
      yAxis: axes.yAxis,
      series: [
        { name: 'Observed', type: 'scatter', data: points, symbolSize: 5, itemStyle: { color: pointColor, opacity: 0.6 } },
        { name: 'Smoothed', type: 'line', data: smooth(points), showSymbol: false, lineStyle: { color: lineColor, width: 3 } },
      ],
      grid: buildGrid({ bottom: 50 }),
      dataZoom: [{ type: 'inside', xAxisIndex: 0 }, { type: 'inside', yAxisIndex: 0 }],
    };
  }
}

chartRegistry.register({
  type: 'loess_smoother_plot',
  family: 'relationships',
  name: 'LOESS Smoother Plot',
  description: 'Scatter plot with a local smoothing trend line',
  renderer: 'echarts',
  compatibleShapes: ['two_numeric', 'three_numeric', 'many_numeric', 'generic'],
  requiredColumns: [
    { role: 'x', acceptedTypes: ['numeric', 'integer', 'float'], label: 'X Axis' },
    { role: 'y', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Y Axis' },
  ],
  createRenderer: () => new LoessSmootherPlotRenderer(),
});
