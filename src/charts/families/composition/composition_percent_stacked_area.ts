import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { pivotLongForm } from '@/charts/echarts/pivotLongForm';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

function percentRows(keys: string[], groups: string[], matrix: number[][]): number[][] {
  const totals = keys.map((_, ki) => groups.reduce((sum, _group, gi) => sum + matrix[gi][ki], 0));
  return matrix.map((row) => row.map((value, ki) => (totals[ki] === 0 ? 0 : (100 * value) / totals[ki])));
}

class CompositionPercentStackedAreaRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    const { keys } = pivotLongForm(
      data.columnArrays[config.columns['date']] ?? [],
      data.columnArrays[config.columns['subgroup']] ?? [],
      data.columnArrays[config.columns['value']] ?? [],
    );
    return keys.length === 0;
  }

  protected emptyMessage(): string {
    return 'No series values to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const { keys, groups, matrix } = pivotLongForm(
      data.columnArrays[config.columns['date']] ?? [],
      data.columnArrays[config.columns['subgroup']] ?? [],
      data.columnArrays[config.columns['value']] ?? [],
    );
    const percentages = percentRows(keys, groups, matrix);
    const axes = buildCartesianAxes(theme, { type: 'category', data: keys, splitLine: false }, { type: 'value', name: '%', axisLine: false });

    return {
      tooltip: buildTooltip('axis'),
      legend: { data: groups, bottom: 8, textStyle: { color: theme.foreground } },
      xAxis: axes.xAxis,
      yAxis: { ...(axes.yAxis as Record<string, unknown>), min: 0, max: 100 } as EChartsOption['yAxis'],
      series: groups.map((name, i) => {
        const color = categoricalColor(theme.colorScale, i, theme.foreground);
        return {
          name,
          type: 'line' as const,
          stack: 'composition',
          areaStyle: {},
          data: percentages[i],
          lineStyle: { color },
          itemStyle: { color },
          symbol: 'none' as const,
        };
      }),
      grid: buildGrid({ top: 40, bottom: 72 }),
    };
  }
}

chartRegistry.register({
  type: 'composition_percent_stacked_area',
  family: 'composition',
  name: 'Composition 100% Stacked Area',
  description: 'Time-varying part-to-whole composition normalized to 100% at each time bucket',
  renderer: 'echarts',
  compatibleShapes: ['time_series_numeric', 'generic'],
  requiredColumns: [
    { role: 'date', acceptedTypes: ['datetime', 'date', 'category', 'numeric', 'integer'], label: 'Date' },
    { role: 'subgroup', acceptedTypes: ['category', 'text'], label: 'Subgroup' },
    { role: 'value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Value' },
  ],
  createRenderer: () => new CompositionPercentStackedAreaRenderer(),
});
