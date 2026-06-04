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

class GroupedBarRenderer extends EChartsBaseRenderer {
  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const { keys: categories, groups: subgroups, matrix } = pivotLongForm(
      data.columnArrays[config.columns['category']] ?? [],
      data.columnArrays[config.columns['subgroup']] ?? [],
      data.columnArrays[config.columns['value']] ?? [],
    );
    const axes = buildCartesianAxes(theme, { type: 'category', data: categories }, { type: 'value', axisLine: false });

    return {
      tooltip: buildTooltip('axis'),
      legend: { data: subgroups, bottom: 8, textStyle: { color: theme.foreground } },
      xAxis: axes.xAxis,
      yAxis: axes.yAxis,
      series: subgroups.map((name, i) => ({
        type: 'bar',
        name,
        data: matrix[i],
        itemStyle: { color: categoricalColor(theme.colorScale, i, theme.foreground) },
      })),
      grid: buildGrid({ top: 40, bottom: 72 }),
    };
  }
}

chartRegistry.register({
  type: 'grouped_bar',
  family: 'categorical',
  name: 'Grouped Bar Chart',
  description: 'Long-form category, subgroup, and value pivoted into grouped bars',
  renderer: 'echarts',
  compatibleShapes: ['category_numeric', 'generic'],
  requiredColumns: [
    { role: 'category', acceptedTypes: ['category', 'text'], label: 'Category' },
    { role: 'subgroup', acceptedTypes: ['category', 'text'], label: 'Subgroup' },
    { role: 'value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Value' },
  ],
  createRenderer: () => new GroupedBarRenderer(),
});
