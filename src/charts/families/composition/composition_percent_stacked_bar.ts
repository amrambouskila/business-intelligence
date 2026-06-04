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

function percentColumns(keys: string[], groups: string[], matrix: number[][]): number[][] {
  const totals = keys.map((_, ki) => groups.reduce((sum, _group, gi) => sum + matrix[gi][ki], 0));
  return matrix.map((row) => row.map((value, ki) => (totals[ki] === 0 ? 0 : (100 * value) / totals[ki])));
}

class CompositionPercentStackedBarRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    const { keys, groups } = pivotLongForm(
      data.columnArrays[config.columns['category']] ?? [],
      data.columnArrays[config.columns['subgroup']] ?? [],
      data.columnArrays[config.columns['value']] ?? [],
    );
    return keys.length === 0 || groups.length === 0;
  }

  protected emptyMessage(): string {
    return 'No values to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const { keys, groups, matrix } = pivotLongForm(
      data.columnArrays[config.columns['category']] ?? [],
      data.columnArrays[config.columns['subgroup']] ?? [],
      data.columnArrays[config.columns['value']] ?? [],
    );
    const percentages = percentColumns(keys, groups, matrix);
    const axes = buildCartesianAxes(theme, { type: 'category', data: keys }, { type: 'value', name: '%', axisLine: false });

    return {
      tooltip: buildTooltip('axis', { axisPointer: { type: 'shadow' } }),
      legend: { data: groups, bottom: 8, textStyle: { color: theme.foreground } },
      xAxis: axes.xAxis,
      yAxis: { ...(axes.yAxis as Record<string, unknown>), min: 0, max: 100 } as EChartsOption['yAxis'],
      series: groups.map((name, i) => ({
        type: 'bar',
        name,
        stack: 'composition',
        data: percentages[i],
        itemStyle: { color: categoricalColor(theme.colorScale, i, theme.foreground) },
      })),
      grid: buildGrid({ top: 40, bottom: 72 }),
    };
  }
}

chartRegistry.register({
  type: 'composition_percent_stacked_bar',
  family: 'composition',
  name: 'Composition 100% Stacked Bar',
  description: 'Part-to-whole subgroup composition normalized to 100% for each category',
  renderer: 'echarts',
  compatibleShapes: ['category_numeric', 'generic'],
  requiredColumns: [
    { role: 'category', acceptedTypes: ['category', 'text'], label: 'Category' },
    { role: 'subgroup', acceptedTypes: ['category', 'text'], label: 'Subgroup' },
    { role: 'value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Value' },
  ],
  createRenderer: () => new CompositionPercentStackedBarRenderer(),
});
