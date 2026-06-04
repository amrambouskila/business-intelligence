import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

type RunPoint = [string | number, number];

function runPoints(data: DataView, config: ChartConfig): RunPoint[] {
  const dates = data.columnArrays[config.columns['date']] ?? [];
  const values = data.columnArrays[config.columns['value']] ?? [];
  const n = Math.min(dates.length, values.length);
  const points: RunPoint[] = [];
  for (let i = 0; i < n; i++) {
    const value = values[i];
    if (typeof value === 'number' && Number.isFinite(value)) points.push([String(dates[i]), value]);
  }
  return points;
}

function mean(points: RunPoint[]): number {
  return points.reduce((sum, point) => sum + point[1], 0) / points.length;
}

class RunChartRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return runPoints(data, config).length === 0;
  }

  protected emptyMessage(): string {
    return 'No run values to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const points = runPoints(data, config);
    const dateMeta = data.columns.find((c) => c.name === config.columns['date']);
    const isTime = dateMeta?.type === 'datetime' || dateMeta?.type === 'date';
    const color = categoricalColor(theme.colorScale, 0, theme.foreground);
    const centerLine = mean(points);
    const axes = buildCartesianAxes(
      theme,
      isTime ? { type: 'time' } : { type: 'category' },
      { type: 'value', axisLine: false },
    );

    return {
      tooltip: buildTooltip('axis'),
      xAxis: axes.xAxis,
      yAxis: axes.yAxis,
      series: [{
        name: 'Value',
        type: 'line',
        data: points,
        symbol: 'circle',
        symbolSize: 5,
        lineStyle: { color, width: 2 },
        itemStyle: { color },
        markLine: {
          symbol: 'none',
          data: [{ yAxis: centerLine, name: 'Mean' }],
          lineStyle: { color: theme.axisColor, type: 'dashed' },
          label: { color: theme.foreground, formatter: 'Mean' },
        },
      }],
      grid: buildGrid(),
      dataZoom: [{ type: 'inside', xAxisIndex: 0 }],
    };
  }
}

chartRegistry.register({
  type: 'run_chart',
  family: 'time-series',
  name: 'Run Chart',
  description: 'Process values over time with a mean reference line',
  renderer: 'echarts',
  compatibleShapes: ['time_numeric', 'time_series_numeric', 'two_numeric', 'generic'],
  requiredColumns: [
    { role: 'date', acceptedTypes: ['datetime', 'date', 'category', 'numeric', 'integer'], label: 'Date' },
    { role: 'value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Value' },
  ],
  createRenderer: () => new RunChartRenderer(),
});
