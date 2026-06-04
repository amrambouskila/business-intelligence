import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

const WEEKDAY_ORDER = new Map(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => [day, i]));

interface HeatCell {
  weekday: string;
  hour: string;
  value: number;
}

function finiteCells(data: DataView, config: ChartConfig): HeatCell[] {
  const weekdays = data.columnArrays[config.columns['weekday']] ?? [];
  const hours = data.columnArrays[config.columns['hour']] ?? [];
  const values = data.columnArrays[config.columns['value']] ?? [];
  const cells: HeatCell[] = [];
  const n = Math.min(weekdays.length, hours.length, values.length);

  for (let i = 0; i < n; i++) {
    const value = values[i];
    if (typeof value === 'number' && Number.isFinite(value)) {
      cells.push({ weekday: String(weekdays[i]), hour: String(hours[i]), value });
    }
  }

  return cells;
}

function sortedWeekdays(cells: HeatCell[]): string[] {
  return [...new Set(cells.map((cell) => cell.weekday))].sort((a, b) => {
    const ai = WEEKDAY_ORDER.get(a) ?? Number.MAX_SAFE_INTEGER;
    const bi = WEEKDAY_ORDER.get(b) ?? Number.MAX_SAFE_INTEGER;
    return ai - bi || a.localeCompare(b);
  });
}

function sortedHours(cells: HeatCell[]): string[] {
  return [...new Set(cells.map((cell) => cell.hour))].sort((a, b) => Number(a) - Number(b) || a.localeCompare(b));
}

class CandlestickHeatmapByHourDayRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return finiteCells(data, config).length === 0;
  }

  protected emptyMessage(): string {
    return 'No hour/day heatmap values to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const cells = finiteCells(data, config);
    const weekdays = sortedWeekdays(cells);
    const hours = sortedHours(cells);
    const weekdayIndex = new Map(weekdays.map((day, i) => [day, i]));
    const hourIndex = new Map(hours.map((hour, i) => [hour, i]));
    const heatValues = cells.map((cell) => [hourIndex.get(cell.hour)!, weekdayIndex.get(cell.weekday)!, cell.value]);
    const values = cells.map((cell) => cell.value);
    const min = values.reduce((a, b) => (a < b ? a : b), Infinity);
    const max = values.reduce((a, b) => (a > b ? a : b), -Infinity);
    const axes = buildCartesianAxes(
      theme,
      { type: 'category', data: hours, splitLine: false, name: config.columns['hour'] },
      { type: 'category', data: weekdays, splitLine: false, name: config.columns['weekday'] },
    );

    return {
      tooltip: buildTooltip('item'),
      xAxis: axes.xAxis,
      yAxis: axes.yAxis,
      series: [{ name: 'Value', type: 'heatmap', data: heatValues }],
      visualMap: {
        min,
        max,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: 0,
        inRange: { color: [...theme.sequentialScale] },
        textStyle: { color: theme.axisColor },
      },
      grid: buildGrid({ bottom: 70 }),
    };
  }
}

chartRegistry.register({
  type: 'candlestick_heatmap_by_hour_day',
  family: 'finance',
  name: 'Candlestick Heatmap by Hour/Day',
  description: 'Intraday candlestick-derived metric by weekday and hour',
  renderer: 'echarts',
  compatibleShapes: ['category_numeric', 'matrix', 'generic'],
  requiredColumns: [
    { role: 'weekday', acceptedTypes: ['category', 'text'], label: 'Weekday' },
    { role: 'hour', acceptedTypes: ['integer', 'numeric', 'float', 'category', 'text'], label: 'Hour' },
    { role: 'value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Value' },
  ],
  createRenderer: () => new CandlestickHeatmapByHourDayRenderer(),
});
