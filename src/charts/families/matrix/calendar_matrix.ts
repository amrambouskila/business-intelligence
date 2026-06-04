import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_MS = 86_400_000;

type CalendarMatrix = {
  weeks: string[];
  cells: Array<[number, number, number]>;
  finiteValues: number[];
  min: number;
  max: number;
};

function calendarMatrix(data: DataView, config: ChartConfig): CalendarMatrix {
  const dates = data.columnArrays[config.columns['date']] ?? [];
  const values = data.columnArrays[config.columns['value']] ?? [];
  const parsedRows: Array<{ date: Date; value: number }> = [];
  const n = Math.min(dates.length, values.length);
  for (let i = 0; i < n; i++) {
    const date = new Date(String(dates[i]));
    const value = values[i];
    if (!Number.isNaN(date.getTime()) && typeof value === 'number' && Number.isFinite(value)) {
      parsedRows.push({ date, value });
    }
  }
  if (parsedRows.length === 0) return { weeks: [], cells: [], finiteValues: [], min: 0, max: 1 };

  const minTime = parsedRows.reduce((min, row) => Math.min(min, Date.UTC(row.date.getUTCFullYear(), row.date.getUTCMonth(), row.date.getUTCDate())), Infinity);
  const first = new Date(minTime);
  const startTime = minTime - first.getUTCDay() * DAY_MS;
  const weekSet = new Set<number>();
  const cells: Array<[number, number, number]> = [];
  const finiteValues: number[] = [];

  for (const row of parsedRows) {
    const dayTime = Date.UTC(row.date.getUTCFullYear(), row.date.getUTCMonth(), row.date.getUTCDate());
    const week = Math.floor((dayTime - startTime) / (DAY_MS * 7));
    weekSet.add(week);
    cells.push([week, row.date.getUTCDay(), row.value]);
    finiteValues.push(row.value);
  }
  const weeks = Array.from({ length: Math.max(...weekSet) + 1 }, (_, i) => `W${i + 1}`);
  return {
    weeks,
    cells,
    finiteValues,
    min: finiteValues.reduce((a, b) => (a < b ? a : b), Infinity),
    max: finiteValues.reduce((a, b) => (a > b ? a : b), -Infinity),
  };
}

class CalendarMatrixRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return calendarMatrix(data, config).finiteValues.length === 0;
  }

  protected emptyMessage(): string {
    return 'No calendar values to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const matrix = calendarMatrix(data, config);
    const axes = buildCartesianAxes(
      theme,
      { type: 'category', data: matrix.weeks, splitLine: false },
      { type: 'category', data: WEEKDAYS, splitLine: false },
    );
    const option: EChartsOption = {
      tooltip: buildTooltip('item'),
      xAxis: axes.xAxis,
      yAxis: axes.yAxis,
      series: [{
        type: 'heatmap',
        data: matrix.cells,
        itemStyle: { borderColor: theme.background, borderWidth: 1 },
      }],
      grid: buildGrid({ bottom: 60, left: 64 }),
    };
    option.visualMap = {
      min: matrix.min,
      max: matrix.max,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: 0,
      inRange: { color: [...theme.sequentialScale] },
      textStyle: { color: theme.axisColor },
    };
    return option;
  }
}

chartRegistry.register({
  type: 'calendar_matrix',
  family: 'matrix',
  name: 'Calendar Matrix',
  description: 'Weekly calendar grid colored by daily values',
  renderer: 'echarts',
  compatibleShapes: ['time_numeric', 'time_series_numeric', 'matrix', 'generic'],
  requiredColumns: [
    { role: 'date', acceptedTypes: ['datetime', 'date', 'category'], label: 'Date' },
    { role: 'value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Value' },
  ],
  createRenderer: () => new CalendarMatrixRenderer(),
});
