import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

function lagPairs(data: DataView, config: ChartConfig): Array<[number, number]> {
  const values = (data.columnArrays[config.columns['value']] ?? []).filter(
    (value): value is number => typeof value === 'number' && Number.isFinite(value),
  );
  const pairs: Array<[number, number]> = [];
  for (let i = 1; i < values.length; i++) pairs.push([values[i - 1], values[i]]);
  return pairs;
}

class LagPlotRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return lagPairs(data, config).length === 0;
  }

  protected emptyMessage(): string {
    return 'No lag pairs to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const color = categoricalColor(theme.colorScale, 0, theme.foreground);
    const axes = buildCartesianAxes(
      theme,
      { type: 'value', name: 'Lag 1' },
      { type: 'value', name: 'Value', axisLine: false },
    );

    return {
      tooltip: buildTooltip('item'),
      xAxis: axes.xAxis,
      yAxis: axes.yAxis,
      series: [{
        type: 'scatter',
        data: lagPairs(data, config),
        symbolSize: 7,
        itemStyle: { color, opacity: 0.72 },
      }],
      grid: buildGrid(),
    };
  }
}

chartRegistry.register({
  type: 'lag_plot',
  family: 'time-series',
  name: 'Lag Plot',
  description: 'Current value against the previous observation',
  renderer: 'echarts',
  compatibleShapes: ['single_numeric', 'time_numeric', 'time_series_numeric', 'generic'],
  requiredColumns: [
    { role: 'value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Value' },
  ],
  createRenderer: () => new LagPlotRenderer(),
});
