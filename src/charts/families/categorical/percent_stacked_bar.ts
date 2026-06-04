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

class PercentStackedBarRenderer extends EChartsBaseRenderer {
  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const { keys, groups, matrix } = pivotLongForm(
      data.columnArrays[config.columns['category']] ?? [],
      data.columnArrays[config.columns['subgroup']] ?? [],
      data.columnArrays[config.columns['value']] ?? [],
    );

    const columnTotals = keys.map((_, ki) => groups.reduce((sum, _g, gi) => sum + matrix[gi][ki], 0));
    const axes = buildCartesianAxes(
      theme,
      { type: 'category', data: keys },
      { type: 'value', name: '%', axisLine: false },
    );

    return {
      tooltip: buildTooltip('axis', { axisPointer: { type: 'shadow' } }),
      legend: { data: groups, bottom: 8, textStyle: { color: theme.foreground } },
      xAxis: axes.xAxis,
      yAxis: { ...(axes.yAxis as Record<string, unknown>), min: 0, max: 100 } as EChartsOption['yAxis'],
      series: groups.map((name, gi) => ({
        type: 'bar',
        name,
        stack: 'total',
        data: keys.map((_, ki) => (columnTotals[ki] === 0 ? 0 : (100 * matrix[gi][ki]) / columnTotals[ki])),
        itemStyle: { color: categoricalColor(theme.colorScale, gi, theme.foreground) },
      })),
      grid: buildGrid({ top: 40, bottom: 72 }),
    };
  }

  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    const { keys, groups } = pivotLongForm(
      data.columnArrays[config.columns['category']] ?? [],
      data.columnArrays[config.columns['subgroup']] ?? [],
      data.columnArrays[config.columns['value']] ?? [],
    );
    return groups.length === 0 || keys.length === 0;
  }

  protected emptyMessage(): string {
    return 'No values to chart';
  }
}

chartRegistry.register({
  type: 'percent_stacked_bar',
  family: 'categorical',
  name: '100% Stacked Bar',
  description: 'Stacked bars normalized to 100% per category',
  renderer: 'echarts',
  compatibleShapes: ['category_numeric', 'generic'],
  requiredColumns: [
    { role: 'category', acceptedTypes: ['category', 'text'], label: 'Category' },
    { role: 'subgroup', acceptedTypes: ['category', 'text'], label: 'Subgroup' },
    { role: 'value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Value' },
  ],
  createRenderer: () => new PercentStackedBarRenderer(),
});
