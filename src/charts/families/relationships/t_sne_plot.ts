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

function points(data: DataView, config: ChartConfig): Point[] {
  const xs = data.columnArrays[config.columns['x']] ?? [];
  const ys = data.columnArrays[config.columns['y']] ?? [];
  const out: Point[] = [];
  for (let i = 0; i < Math.min(xs.length, ys.length); i++) {
    const x = xs[i];
    const y = ys[i];
    if (typeof x === 'number' && typeof y === 'number' && Number.isFinite(x) && Number.isFinite(y)) out.push([x, y]);
  }
  return out;
}

class TSnePlotRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return points(data, config).length === 0;
  }

  protected emptyMessage(): string {
    return 'No t-SNE coordinates to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const axes = buildCartesianAxes(
      theme,
      { type: 'value', name: config.columns['x'], nameGap: 30 },
      { type: 'value', name: config.columns['y'], nameGap: 40, axisLine: false },
    );
    const color = categoricalColor(theme.colorScale, 0, theme.foreground);
    return {
      tooltip: buildTooltip('item'),
      xAxis: axes.xAxis,
      yAxis: axes.yAxis,
      series: [{ name: 't-SNE', type: 'scatter', data: points(data, config), symbolSize: 6, itemStyle: { color, opacity: 0.75 } }],
      grid: buildGrid({ bottom: 50 }),
      dataZoom: [{ type: 'inside', xAxisIndex: 0 }, { type: 'inside', yAxisIndex: 0 }],
    };
  }
}

chartRegistry.register({
  type: 't_sne_plot',
  family: 'relationships',
  name: 't-SNE Plot',
  description: 'Two-dimensional t-SNE embedding scatter plot',
  renderer: 'echarts',
  compatibleShapes: ['two_numeric', 'many_numeric', 'generic'],
  requiredColumns: [
    { role: 'x', acceptedTypes: ['numeric', 'integer', 'float'], label: 'X' },
    { role: 'y', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Y' },
  ],
  createRenderer: () => new TSnePlotRenderer(),
});
