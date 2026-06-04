import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

type ConeRows = {
  dates: string[];
  center: number[];
  lower: number[];
  upper: number[];
};

function coneRows(data: DataView, config: ChartConfig): ConeRows {
  const dates = data.columnArrays[config.columns['date']] ?? [];
  const center = data.columnArrays[config.columns['center']] ?? [];
  const lower = data.columnArrays[config.columns['lower']] ?? [];
  const upper = data.columnArrays[config.columns['upper']] ?? [];
  const n = Math.min(dates.length, center.length, lower.length, upper.length);
  const rows: ConeRows = { dates: [], center: [], lower: [], upper: [] };
  for (let i = 0; i < n; i++) {
    const values = [center[i], lower[i], upper[i]];
    if (values.every((value) => typeof value === 'number' && Number.isFinite(value))) {
      rows.dates.push(String(dates[i]));
      rows.center.push(center[i] as number);
      rows.lower.push(lower[i] as number);
      rows.upper.push(upper[i] as number);
    }
  }
  return rows;
}

function lineData(dates: string[], values: number[], isTime: boolean): Array<number | [string, number]> {
  return isTime ? dates.map((date, i) => [date, values[i]]) : values;
}

class ForecastConeRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return coneRows(data, config).dates.length === 0;
  }

  protected emptyMessage(): string {
    return 'No forecast cone values to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const rows = coneRows(data, config);
    const dateMeta = data.columns.find((c) => c.name === config.columns['date']);
    const isTime = dateMeta?.type === 'datetime' || dateMeta?.type === 'date';
    const centerColor = categoricalColor(theme.colorScale, 0, theme.foreground);
    const coneColor = categoricalColor(theme.colorScale, 1, theme.axisColor);
    const axes = buildCartesianAxes(
      theme,
      isTime ? { type: 'time' } : { type: 'category', data: rows.dates.map(String), splitLine: false },
      { type: 'value', axisLine: false },
    );

    return {
      tooltip: buildTooltip('axis'),
      legend: { data: ['Lower', 'Center', 'Upper'], bottom: 8, textStyle: { color: theme.foreground } },
      xAxis: axes.xAxis,
      yAxis: axes.yAxis,
      series: [
        {
          name: 'Lower',
          type: 'line',
          data: lineData(rows.dates, rows.lower, isTime),
          symbol: 'none',
          lineStyle: { color: coneColor, type: 'dashed', width: 1.5 },
          itemStyle: { color: coneColor },
        },
        {
          name: 'Center',
          type: 'line',
          data: lineData(rows.dates, rows.center, isTime),
          symbol: 'none',
          lineStyle: { color: centerColor, width: 2.5 },
          itemStyle: { color: centerColor },
        },
        {
          name: 'Upper',
          type: 'line',
          data: lineData(rows.dates, rows.upper, isTime),
          symbol: 'none',
          lineStyle: { color: coneColor, type: 'dashed', width: 1.5 },
          itemStyle: { color: coneColor },
          areaStyle: { opacity: 0.12, color: coneColor },
        },
      ],
      grid: buildGrid({ top: 36, bottom: 72 }),
      dataZoom: [{ type: 'inside', xAxisIndex: 0 }],
    };
  }
}

chartRegistry.register({
  type: 'forecast_cone',
  family: 'time-series',
  name: 'Forecast Cone',
  description: 'Central forecast with lower and upper uncertainty bounds',
  renderer: 'echarts',
  compatibleShapes: ['time_numeric', 'time_series_numeric', 'generic'],
  requiredColumns: [
    { role: 'date', acceptedTypes: ['datetime', 'date', 'category', 'numeric', 'integer'], label: 'Date' },
    { role: 'center', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Center' },
    { role: 'lower', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Lower' },
    { role: 'upper', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Upper' },
  ],
  createRenderer: () => new ForecastConeRenderer(),
});
