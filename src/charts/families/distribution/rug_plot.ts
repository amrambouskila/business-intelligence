import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

function finiteValues(data: DataView, config: ChartConfig): number[] {
  const valueCol = config.columns['value'];
  return (data.columnArrays[valueCol] ?? []).filter((v): v is number => Number.isFinite(v));
}

class RugPlotRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return finiteValues(data, config).length === 0;
  }

  protected emptyMessage(): string {
    return 'No numeric values to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const values = finiteValues(data, config);
    const axes = buildCartesianAxes(
      theme,
      { type: 'value', name: config.columns['value'], nameGap: 30 },
      { type: 'value', axisLine: false, splitLine: false },
    );

    return {
      tooltip: buildTooltip('item'),
      xAxis: axes.xAxis,
      yAxis: { ...(axes.yAxis as Record<string, unknown>), min: -1, max: 1, axisLabel: { show: false } },
      series: [{
        type: 'scatter',
        data: values.map((v) => [v, 0]),
        symbol: 'rect',
        symbolSize: [2, 16],
        itemStyle: { color: categoricalColor(theme.colorScale, 0, theme.foreground), opacity: 0.75 },
      }],
      grid: buildGrid({ bottom: 55 }),
    };
  }
}

chartRegistry.register({
  type: 'rug_plot',
  family: 'distribution',
  name: 'Rug Plot',
  description: 'One-dimensional tick marks showing individual numeric observations',
  renderer: 'echarts',
  compatibleShapes: ['single_numeric', 'category_numeric', 'generic'],
  requiredColumns: [{ role: 'value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Value' }],
  createRenderer: () => new RugPlotRenderer(),
});
