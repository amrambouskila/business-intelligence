import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

function drawdownPoints(data: DataView, config: ChartConfig): Array<[string, number]> {
  const dates = data.columnArrays[config.columns['date']] ?? [];
  const equity = data.columnArrays[config.columns['equity']] ?? [];
  const points: Array<[string, number]> = [];
  let peak = -Infinity;
  for (let i = 0; i < Math.min(dates.length, equity.length); i++) {
    const value = equity[i];
    if (!Number.isFinite(value)) continue;
    const finiteValue = value as number;
    peak = Math.max(peak, finiteValue);
    const drawdown = peak > 0 ? ((finiteValue - peak) / peak) * 100 : 0;
    points.push([String(dates[i]), Math.round(drawdown * 100) / 100]);
  }
  return points;
}

class DrawdownRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return drawdownPoints(data, config).length === 0;
  }

  protected emptyMessage(): string {
    return 'No equity values to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const dateMeta = data.columns.find((c) => c.name === config.columns['date']);
    const isTime = dateMeta?.type === 'datetime' || dateMeta?.type === 'date';
    const axes = buildCartesianAxes(theme, isTime ? { type: 'time' } : { type: 'category' }, { type: 'value', axisLine: false });
    const color = categoricalColor(theme.colorScale, 1, theme.foreground);

    return {
      tooltip: buildTooltip('axis'),
      xAxis: axes.xAxis,
      yAxis: { ...(axes.yAxis as object), axisLabel: { color: theme.axisColor, formatter: '{value}%' } },
      series: [{
        type: 'line',
        data: drawdownPoints(data, config),
        areaStyle: { color, opacity: 0.18 },
        lineStyle: { color, width: 2 },
        itemStyle: { color },
        symbol: 'none',
      }],
      grid: buildGrid(),
      dataZoom: [{ type: 'inside', xAxisIndex: 0 }],
    };
  }
}

chartRegistry.register({
  type: 'drawdown',
  family: 'finance',
  name: 'Drawdown Chart',
  description: 'Percentage decline from the running equity peak',
  renderer: 'echarts',
  compatibleShapes: ['time_numeric', 'ohlcv', 'generic'],
  requiredColumns: [
    { role: 'date', acceptedTypes: ['datetime', 'date', 'category'], label: 'Date' },
    { role: 'equity', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Equity' },
  ],
  createRenderer: () => new DrawdownRenderer(),
});
