import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

function returnPoints(data: DataView, config: ChartConfig): Array<[string, number]> {
  const dates = data.columnArrays[config.columns['date']] ?? [];
  const returns = data.columnArrays[config.columns['return']] ?? [];
  const points: Array<[string, number]> = [];
  for (let i = 0; i < Math.min(dates.length, returns.length); i++) {
    if (Number.isFinite(returns[i])) points.push([String(dates[i]), returns[i] as number]);
  }
  return points;
}

class ReturnSeriesLineRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return returnPoints(data, config).length === 0;
  }

  protected emptyMessage(): string {
    return 'No return values to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const dateMeta = data.columns.find((c) => c.name === config.columns['date']);
    const isTime = dateMeta?.type === 'datetime' || dateMeta?.type === 'date';
    const axes = buildCartesianAxes(theme, isTime ? { type: 'time' } : { type: 'category' }, { type: 'value', axisLine: false });
    const color = categoricalColor(theme.colorScale, 0, theme.foreground);

    return {
      tooltip: buildTooltip('axis'),
      xAxis: axes.xAxis,
      yAxis: axes.yAxis,
      series: [{ type: 'line', data: returnPoints(data, config), lineStyle: { color, width: 2 }, itemStyle: { color }, symbol: 'none' }],
      grid: buildGrid(),
      dataZoom: [{ type: 'inside', xAxisIndex: 0 }],
    };
  }
}

chartRegistry.register({
  type: 'return_series_line',
  family: 'finance',
  name: 'Return Series Line',
  description: 'Financial returns plotted over time',
  renderer: 'echarts',
  compatibleShapes: ['time_numeric', 'ohlcv', 'generic'],
  requiredColumns: [
    { role: 'date', acceptedTypes: ['datetime', 'date', 'category'], label: 'Date' },
    { role: 'return', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Return' },
  ],
  createRenderer: () => new ReturnSeriesLineRenderer(),
});
