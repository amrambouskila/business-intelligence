import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { pivotLongForm } from '@/charts/echarts/pivotLongForm';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

class StackedAreaRenderer extends EChartsBaseRenderer {
  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const { keys: xCategories, groups: seriesNames, matrix } = pivotLongForm(
      data.columnArrays[config.columns['x']] ?? [],
      data.columnArrays[config.columns['series']] ?? [],
      data.columnArrays[config.columns['y']] ?? [],
    );
    const axes = buildCartesianAxes(
      theme,
      { type: 'category', data: xCategories, splitLine: false },
      { type: 'value', axisLine: false },
    );

    return {
      tooltip: buildTooltip('axis'),
      legend: { data: seriesNames, bottom: 8, textStyle: { color: theme.foreground } },
      xAxis: axes.xAxis,
      yAxis: axes.yAxis,
      // 0-backfilled matrix (not null) so the stacked baseline stays continuous.
      series: seriesNames.map((name, i) => ({
        name,
        type: 'line' as const,
        stack: 'total',
        areaStyle: {},
        data: matrix[i],
        lineStyle: { color: categoricalColor(theme.colorScale, i, theme.foreground) },
        itemStyle: { color: categoricalColor(theme.colorScale, i, theme.foreground) },
        symbol: 'none',
      })),
      grid: buildGrid({ top: 40, bottom: 72 }),
    };
  }
}

chartRegistry.register({
  type: 'stacked_area',
  family: 'time-series',
  name: 'Stacked Area Chart',
  description: 'Long-form date, series, and value pivoted into stacked areas',
  renderer: 'echarts',
  compatibleShapes: ['time_series_numeric', 'generic'],
  requiredColumns: [
    { role: 'x', acceptedTypes: ['datetime', 'date', 'category', 'numeric', 'integer'], label: 'X Axis' },
    { role: 'series', acceptedTypes: ['category', 'text'], label: 'Series' },
    { role: 'y', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Value' },
  ],
  createRenderer: () => new StackedAreaRenderer(),
});
