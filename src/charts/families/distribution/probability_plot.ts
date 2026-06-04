import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { normalQuantile } from '@/data/stats/normalQuantile';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

function probabilityPoints(data: DataView, config: ChartConfig): number[][] {
  const values = (data.columnArrays[config.columns['value']] ?? [])
    .filter((v): v is number => Number.isFinite(v))
    .sort((a, b) => a - b);
  const n = values.length;
  return values.map((value, i) => [value, normalQuantile((i + 0.5) / n)]);
}

class ProbabilityPlotRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return probabilityPoints(data, config).length === 0;
  }

  protected emptyMessage(): string {
    return 'No numeric values to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const pointColor = categoricalColor(theme.colorScale, 0, theme.foreground);
    const lineColor = categoricalColor(theme.colorScale, 1, theme.foreground);
    const points = probabilityPoints(data, config);
    const line = points.length > 0 ? [points[0], points[points.length - 1]] : [];
    const axes = buildCartesianAxes(
      theme,
      { type: 'value', name: config.columns['value'], nameGap: 30 },
      { type: 'value', name: 'Normal quantile', nameGap: 55, axisLine: false },
    );

    return {
      tooltip: buildTooltip('item'),
      xAxis: axes.xAxis,
      yAxis: axes.yAxis,
      series: [
        { type: 'scatter', data: points, symbolSize: 6, itemStyle: { color: pointColor } },
        { type: 'line', data: line, showSymbol: false, lineStyle: { color: lineColor }, itemStyle: { color: lineColor } },
      ],
      grid: buildGrid({ bottom: 50 }),
    };
  }
}

chartRegistry.register({
  type: 'probability_plot',
  family: 'distribution',
  name: 'Probability Plot',
  description: 'Ordered observations against normal-probability plotting positions',
  renderer: 'echarts',
  compatibleShapes: ['single_numeric', 'category_numeric', 'generic'],
  requiredColumns: [{ role: 'value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Value' }],
  createRenderer: () => new ProbabilityPlotRenderer(),
});
