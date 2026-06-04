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

class CompositionStackedBarRenderer extends EChartsBaseRenderer {
  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const { keys, groups, matrix } = pivotLongForm(
      data.columnArrays[config.columns['category']] ?? [],
      data.columnArrays[config.columns['subgroup']] ?? [],
      data.columnArrays[config.columns['value']] ?? [],
    );
    const axes = buildCartesianAxes(theme, { type: 'category', data: keys }, { type: 'value', axisLine: false });

    return {
      tooltip: buildTooltip('axis', { axisPointer: { type: 'shadow' } }),
      legend: { data: groups, bottom: 8, textStyle: { color: theme.foreground } },
      xAxis: axes.xAxis,
      yAxis: axes.yAxis,
      series: groups.map((name, i) => ({
        type: 'bar',
        name,
        stack: 'composition',
        data: matrix[i],
        itemStyle: { color: categoricalColor(theme.colorScale, i, theme.foreground) },
      })),
      grid: buildGrid({ top: 40, bottom: 72 }),
    };
  }
}

chartRegistry.register({
  type: 'composition_stacked_bar',
  family: 'composition',
  name: 'Composition Stacked Bar',
  description: 'Part-to-whole category composition split into stacked subgroup contributions',
  renderer: 'echarts',
  compatibleShapes: ['category_numeric', 'generic'],
  requiredColumns: [
    { role: 'category', acceptedTypes: ['category', 'text'], label: 'Category' },
    { role: 'subgroup', acceptedTypes: ['category', 'text'], label: 'Subgroup' },
    { role: 'value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Value' },
  ],
  createRenderer: () => new CompositionStackedBarRenderer(),
});
