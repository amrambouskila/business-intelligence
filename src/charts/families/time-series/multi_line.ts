import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { resolveOptions } from '@/charts/resolve-options';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartOptionSpec } from '@/charts/option-spec';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

const optionSpecs: ChartOptionSpec[] = [
  { key: 'smooth', label: 'Smooth', control: 'toggle', default: false },
];

class MultiLineRenderer extends EChartsBaseRenderer {
  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const dateCol = config.columns['date'];
    const seriesCol = config.columns['series'];
    const valueCol = config.columns['value'];
    const dates = data.columnArrays[dateCol] ?? [];
    const seriesKeys = data.columnArrays[seriesCol] ?? [];
    const values = (data.columnArrays[valueCol] ?? []) as (number | string)[];
    const smooth = resolveOptions(optionSpecs, config.options).smooth as boolean;

    const dateMeta = data.columns.find((c) => c.name === dateCol);
    const isTime = dateMeta?.type === 'datetime' || dateMeta?.type === 'date';

    // Pivot long-form rows into one [date, value] series per distinct series key,
    // preserving first-seen series order so colors are stable across renders.
    const order: string[] = [];
    const byKey = new Map<string, Array<[number | string, number | string]>>();
    for (let i = 0; i < seriesKeys.length; i++) {
      const key = String(seriesKeys[i]);
      let points = byKey.get(key);
      if (!points) {
        points = [];
        byKey.set(key, points);
        order.push(key);
      }
      points.push([dates[i] as number | string, values[i]]);
    }

    const series = order.map((key, i) => {
      const color = categoricalColor(theme.colorScale, i, theme.foreground);
      return {
        type: 'line' as const,
        name: key,
        data: byKey.get(key)!,
        smooth,
        lineStyle: { color, width: 2 },
        itemStyle: { color },
        symbol: 'none' as const,
      };
    });

    const axes = buildCartesianAxes(
      theme,
      isTime ? { type: 'time' } : { type: 'category' },
      { type: 'value', axisLine: false },
    );

    return {
      tooltip: buildTooltip('axis', { axisPointer: { type: 'cross' } }),
      legend: { bottom: 8, textStyle: { color: theme.foreground } },
      xAxis: axes.xAxis,
      yAxis: axes.yAxis,
      series,
      grid: buildGrid({ top: 40, bottom: 72 }),
      dataZoom: [{ type: 'inside', xAxisIndex: 0 }],
    };
  }
}

chartRegistry.register({
  type: 'multi_line',
  family: 'time-series',
  name: 'Multi-Series Line Chart',
  description: 'Long-form date, series, value pivoted into one independent line per series',
  renderer: 'echarts',
  compatibleShapes: ['time_series_numeric', 'generic'],
  requiredColumns: [
    { role: 'date', acceptedTypes: ['datetime', 'date', 'numeric', 'integer', 'category'], label: 'Date' },
    { role: 'series', acceptedTypes: ['category', 'text', 'boolean'], label: 'Series' },
    { role: 'value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Value' },
  ],
  options: optionSpecs,
  createRenderer: () => new MultiLineRenderer(),
});
