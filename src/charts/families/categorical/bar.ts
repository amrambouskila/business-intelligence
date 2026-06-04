import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { groupByAggregate } from '@/data/transforms/groupByAggregate';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

class BarRenderer extends EChartsBaseRenderer {
  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    // Aggregate by category (summing repeated keys) so long-form data renders one
    // bar per category rather than one per raw row; non-finite values are dropped.
    const { keys: categories, values } = groupByAggregate(
      data.columnArrays[config.columns['category']] ?? [],
      data.columnArrays[config.columns['value']] ?? [],
      'sum',
    );

    const axes = buildCartesianAxes(theme, { type: 'category', data: categories }, { type: 'value', axisLine: false });

    return {
      tooltip: buildTooltip('axis'),
      xAxis: axes.xAxis,
      yAxis: axes.yAxis,
      series: [{
        type: 'bar',
        data: values,
        itemStyle: { color: categoricalColor(theme.colorScale, 0, theme.foreground) },
      }],
      grid: buildGrid(),
    };
  }
}

chartRegistry.register({
  type: 'bar',
  family: 'categorical',
  name: 'Bar Chart',
  description: 'Vertical bars comparing a numeric value across categories',
  renderer: 'echarts',
  compatibleShapes: ['category_numeric', 'generic'],
  requiredColumns: [
    { role: 'category', acceptedTypes: ['category', 'text'], label: 'Category' },
    { role: 'value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Value' },
  ],
  createRenderer: () => new BarRenderer(),
});
