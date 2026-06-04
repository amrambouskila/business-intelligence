import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

function finitePoints(data: DataView, config: ChartConfig): Array<[string, number]> {
  const dates = data.columnArrays[config.columns['date']] ?? [];
  const equity = data.columnArrays[config.columns['equity']] ?? [];
  const points: Array<[string, number]> = [];
  for (let i = 0; i < Math.min(dates.length, equity.length); i++) {
    if (Number.isFinite(equity[i])) points.push([String(dates[i]), equity[i] as number]);
  }
  return points;
}

class EquityCurveRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return finitePoints(data, config).length === 0;
  }

  protected emptyMessage(): string {
    return 'No equity values to chart';
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
      series: [{ type: 'line', data: finitePoints(data, config), smooth: true, lineStyle: { color, width: 2 }, itemStyle: { color } }],
      grid: buildGrid(),
      dataZoom: [{ type: 'inside', xAxisIndex: 0 }],
    };
  }
}

chartRegistry.register({
  type: 'equity_curve',
  family: 'finance',
  name: 'Equity Curve',
  description: 'Portfolio or strategy equity over time',
  renderer: 'echarts',
  compatibleShapes: ['time_numeric', 'ohlcv', 'generic'],
  requiredColumns: [
    { role: 'date', acceptedTypes: ['datetime', 'date', 'category'], label: 'Date' },
    { role: 'equity', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Equity' },
  ],
  createRenderer: () => new EquityCurveRenderer(),
});
