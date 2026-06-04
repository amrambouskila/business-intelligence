import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { normalCdf } from '@/data/stats/normalCdf';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

function finiteSortedValues(data: DataView, config: ChartConfig): number[] {
  return (data.columnArrays[config.columns['value']] ?? [])
    .filter((v): v is number => Number.isFinite(v))
    .sort((a, b) => a - b);
}

function meanAndSd(values: number[]): { mean: number; sd: number } {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return { mean, sd: Math.sqrt(variance) };
}

function ppPoints(data: DataView, config: ChartConfig): number[][] {
  const values = finiteSortedValues(data, config);
  if (values.length === 0) return [];
  const { mean, sd } = meanAndSd(values);
  return values.map((value, i) => {
    const empirical = (i + 0.5) / values.length;
    const theoretical = sd === 0 ? 0.5 : normalCdf((value - mean) / sd);
    return [theoretical, empirical];
  });
}

class PPPlotRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return ppPoints(data, config).length === 0;
  }

  protected emptyMessage(): string {
    return 'No numeric values to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const pointColor = categoricalColor(theme.colorScale, 0, theme.foreground);
    const lineColor = categoricalColor(theme.colorScale, 1, theme.foreground);
    const axes = buildCartesianAxes(
      theme,
      { type: 'value', name: 'Theoretical probability', nameGap: 35 },
      { type: 'value', name: 'Empirical probability', nameGap: 55, axisLine: false },
    );

    return {
      tooltip: buildTooltip('item'),
      xAxis: axes.xAxis,
      yAxis: axes.yAxis,
      series: [
        { type: 'scatter', data: ppPoints(data, config), symbolSize: 6, itemStyle: { color: pointColor } },
        { type: 'line', data: [[0, 0], [1, 1]], showSymbol: false, lineStyle: { color: lineColor }, itemStyle: { color: lineColor } },
      ],
      grid: buildGrid({ bottom: 55 }),
    };
  }
}

chartRegistry.register({
  type: 'pp_plot',
  family: 'distribution',
  name: 'P-P Plot',
  description: 'Empirical probabilities compared with fitted normal probabilities',
  renderer: 'echarts',
  compatibleShapes: ['single_numeric', 'category_numeric', 'generic'],
  requiredColumns: [{ role: 'value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Value' }],
  createRenderer: () => new PPPlotRenderer(),
});
