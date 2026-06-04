import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

type FanRows = {
  dates: string[];
  p10: number[];
  p25: number[];
  p50: number[];
  p75: number[];
  p90: number[];
};

function fanRows(data: DataView, config: ChartConfig): FanRows {
  const dates = data.columnArrays[config.columns['date']] ?? [];
  const p10 = data.columnArrays[config.columns['p10']] ?? [];
  const p25 = data.columnArrays[config.columns['p25']] ?? [];
  const p50 = data.columnArrays[config.columns['p50']] ?? [];
  const p75 = data.columnArrays[config.columns['p75']] ?? [];
  const p90 = data.columnArrays[config.columns['p90']] ?? [];
  const n = Math.min(dates.length, p10.length, p25.length, p50.length, p75.length, p90.length);
  const rows: FanRows = { dates: [], p10: [], p25: [], p50: [], p75: [], p90: [] };
  for (let i = 0; i < n; i++) {
    const values = [p10[i], p25[i], p50[i], p75[i], p90[i]];
    if (values.every((value) => typeof value === 'number' && Number.isFinite(value))) {
      rows.dates.push(String(dates[i]));
      rows.p10.push(p10[i] as number);
      rows.p25.push(p25[i] as number);
      rows.p50.push(p50[i] as number);
      rows.p75.push(p75[i] as number);
      rows.p90.push(p90[i] as number);
    }
  }
  return rows;
}

function lineData(dates: string[], values: number[], isTime: boolean): Array<number | [string, number]> {
  return isTime ? dates.map((date, i) => [date, values[i]]) : values;
}

class FanChartRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return fanRows(data, config).dates.length === 0;
  }

  protected emptyMessage(): string {
    return 'No forecast quantiles to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const rows = fanRows(data, config);
    const dateMeta = data.columns.find((c) => c.name === config.columns['date']);
    const isTime = dateMeta?.type === 'datetime' || dateMeta?.type === 'date';
    const medianColor = categoricalColor(theme.colorScale, 0, theme.foreground);
    const bandColor = categoricalColor(theme.colorScale, 1, theme.axisColor);
    const axes = buildCartesianAxes(
      theme,
      isTime ? { type: 'time' } : { type: 'category', data: rows.dates.map(String), splitLine: false },
      { type: 'value', axisLine: false },
    );

    return {
      tooltip: buildTooltip('axis'),
      legend: { data: ['p10', 'p25', 'p50', 'p75', 'p90'], bottom: 8, textStyle: { color: theme.foreground } },
      xAxis: axes.xAxis,
      yAxis: axes.yAxis,
      series: [
        {
          name: 'p10',
          type: 'line',
          data: lineData(rows.dates, rows.p10, isTime),
          lineStyle: { color: bandColor, type: 'dashed', width: 1 },
          itemStyle: { color: bandColor },
          symbol: 'none',
        },
        {
          name: 'p25',
          type: 'line',
          data: lineData(rows.dates, rows.p25, isTime),
          lineStyle: { color: bandColor, width: 1.5 },
          itemStyle: { color: bandColor },
          symbol: 'none',
        },
        {
          name: 'p50',
          type: 'line',
          data: lineData(rows.dates, rows.p50, isTime),
          lineStyle: { color: medianColor, width: 2.5 },
          itemStyle: { color: medianColor },
          symbol: 'none',
        },
        {
          name: 'p75',
          type: 'line',
          data: lineData(rows.dates, rows.p75, isTime),
          lineStyle: { color: bandColor, width: 1.5 },
          itemStyle: { color: bandColor },
          symbol: 'none',
        },
        {
          name: 'p90',
          type: 'line',
          data: lineData(rows.dates, rows.p90, isTime),
          lineStyle: { color: bandColor, type: 'dashed', width: 1 },
          itemStyle: { color: bandColor },
          symbol: 'none',
        },
      ],
      grid: buildGrid({ top: 40, bottom: 72 }),
      dataZoom: [{ type: 'inside', xAxisIndex: 0 }],
    };
  }
}

chartRegistry.register({
  type: 'fan_chart',
  family: 'time-series',
  name: 'Fan Chart',
  description: 'Forecast quantile bands over time',
  renderer: 'echarts',
  compatibleShapes: ['time_numeric', 'time_series_numeric', 'generic'],
  requiredColumns: [
    { role: 'date', acceptedTypes: ['datetime', 'date', 'category', 'numeric', 'integer'], label: 'Date' },
    { role: 'p10', acceptedTypes: ['numeric', 'integer', 'float'], label: 'P10' },
    { role: 'p25', acceptedTypes: ['numeric', 'integer', 'float'], label: 'P25' },
    { role: 'p50', acceptedTypes: ['numeric', 'integer', 'float'], label: 'P50' },
    { role: 'p75', acceptedTypes: ['numeric', 'integer', 'float'], label: 'P75' },
    { role: 'p90', acceptedTypes: ['numeric', 'integer', 'float'], label: 'P90' },
  ],
  createRenderer: () => new FanChartRenderer(),
});
