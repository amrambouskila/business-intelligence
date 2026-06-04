import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { partialAutocorrelation } from '@/data/stats/partialAutocorrelation';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

function pacfPoints(data: DataView, config: ChartConfig): Array<{ lag: number; value: number }> {
  return partialAutocorrelation(data.columnArrays[config.columns['value']] ?? [], 24);
}

class PartialAutocorrelationPlotRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return pacfPoints(data, config).length === 0;
  }

  protected emptyMessage(): string {
    return 'No partial autocorrelation values to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const points = pacfPoints(data, config);
    const color = categoricalColor(theme.colorScale, 0, theme.foreground);
    const axes = buildCartesianAxes(
      theme,
      { type: 'category', data: points.map((point) => String(point.lag)), splitLine: false },
      { type: 'value', axisLine: false },
    );

    return {
      tooltip: buildTooltip('axis'),
      xAxis: axes.xAxis,
      yAxis: { ...(axes.yAxis as Record<string, unknown>), min: -1, max: 1 },
      series: [{
        type: 'bar',
        data: points.map((point) => +point.value.toFixed(6)),
        itemStyle: { color },
        markLine: {
          symbol: 'none',
          lineStyle: { color: theme.axisColor, type: 'dashed' },
          data: [{ yAxis: 0, name: 'Zero' }],
        },
      }],
      grid: buildGrid(),
    };
  }
}

chartRegistry.register({
  type: 'partial_autocorrelation_plot',
  family: 'time-series',
  name: 'Partial Autocorrelation Plot',
  description: 'Partial serial correlation by lag for an ordered numeric series',
  renderer: 'echarts',
  compatibleShapes: ['single_numeric', 'time_numeric', 'time_series_numeric', 'generic'],
  requiredColumns: [
    { role: 'value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Value' },
  ],
  createRenderer: () => new PartialAutocorrelationPlotRenderer(),
});
