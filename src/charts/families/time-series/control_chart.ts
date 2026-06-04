import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

type ControlRows = {
  dates: string[];
  values: number[];
  upper: number[];
  lower: number[];
};

function controlRows(data: DataView, config: ChartConfig): ControlRows {
  const dates = data.columnArrays[config.columns['date']] ?? [];
  const values = data.columnArrays[config.columns['value']] ?? [];
  const upper = data.columnArrays[config.columns['ucl']] ?? [];
  const lower = data.columnArrays[config.columns['lcl']] ?? [];
  const n = Math.min(dates.length, values.length, upper.length, lower.length);
  const rows: ControlRows = { dates: [], values: [], upper: [], lower: [] };
  for (let i = 0; i < n; i++) {
    const value = values[i];
    const ucl = upper[i];
    const lcl = lower[i];
    if (
      typeof value === 'number' && Number.isFinite(value)
      && typeof ucl === 'number' && Number.isFinite(ucl)
      && typeof lcl === 'number' && Number.isFinite(lcl)
    ) {
      rows.dates.push(String(dates[i]));
      rows.values.push(value);
      rows.upper.push(ucl);
      rows.lower.push(lcl);
    }
  }
  return rows;
}

class ControlChartRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return controlRows(data, config).values.length === 0;
  }

  protected emptyMessage(): string {
    return 'No control rows to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const rows = controlRows(data, config);
    const dateMeta = data.columns.find((c) => c.name === config.columns['date']);
    const isTime = dateMeta?.type === 'datetime' || dateMeta?.type === 'date';
    const axes = buildCartesianAxes(
      theme,
      isTime ? { type: 'time' } : { type: 'category', data: rows.dates.map(String), splitLine: false },
      { type: 'value', axisLine: false },
    );
    const valueColor = categoricalColor(theme.colorScale, 0, theme.foreground);
    const limitColor = categoricalColor(theme.colorScale, 1, theme.axisColor);

    return {
      tooltip: buildTooltip('axis'),
      legend: { data: ['Value', 'UCL', 'LCL'], bottom: 8, textStyle: { color: theme.foreground } },
      xAxis: axes.xAxis,
      yAxis: axes.yAxis,
      series: [
        {
          name: 'Value',
          type: 'line',
          data: isTime ? rows.dates.map((date, i) => [date, rows.values[i]]) : rows.values,
          lineStyle: { color: valueColor, width: 2 },
          itemStyle: { color: valueColor },
          symbol: 'circle',
          symbolSize: 5,
        },
        {
          name: 'UCL',
          type: 'line',
          data: isTime ? rows.dates.map((date, i) => [date, rows.upper[i]]) : rows.upper,
          lineStyle: { color: limitColor, type: 'dashed', width: 1.5 },
          itemStyle: { color: limitColor },
          symbol: 'none',
        },
        {
          name: 'LCL',
          type: 'line',
          data: isTime ? rows.dates.map((date, i) => [date, rows.lower[i]]) : rows.lower,
          lineStyle: { color: limitColor, type: 'dashed', width: 1.5 },
          itemStyle: { color: limitColor },
          symbol: 'none',
        },
      ],
      grid: buildGrid({ top: 40, bottom: 72 }),
      dataZoom: [{ type: 'inside', xAxisIndex: 0 }],
    };
  }
}

chartRegistry.register({
  type: 'control_chart',
  family: 'time-series',
  name: 'Control Chart',
  description: 'Process values over time with upper and lower control limits',
  renderer: 'echarts',
  compatibleShapes: ['time_numeric', 'time_series_numeric', 'generic'],
  requiredColumns: [
    { role: 'date', acceptedTypes: ['datetime', 'date', 'category', 'numeric', 'integer'], label: 'Date' },
    { role: 'value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Value' },
    { role: 'ucl', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Upper Control Limit' },
    { role: 'lcl', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Lower Control Limit' },
  ],
  createRenderer: () => new ControlChartRenderer(),
});
