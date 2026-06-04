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

class HorizontalBarRenderer extends EChartsBaseRenderer {
  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    // Aggregate by category (summing repeated keys) so long-form data renders one
    // bar per category rather than one per raw row; non-finite values are dropped.
    const { keys: categories, values } = groupByAggregate(
      data.columnArrays[config.columns['category']] ?? [],
      data.columnArrays[config.columns['value']] ?? [],
      'sum',
    );

    // Axes swapped vs. a vertical bar: value runs along x, categories down y, so
    // ECharts lays the bars out horizontally.
    const axes = buildCartesianAxes(
      theme,
      { type: 'value', axisLine: false },
      { type: 'category', data: categories },
    );

    return {
      tooltip: buildTooltip('axis', { axisPointer: { type: 'shadow' } }),
      xAxis: axes.xAxis,
      yAxis: axes.yAxis,
      series: [{
        type: 'bar',
        data: values,
        itemStyle: { color: categoricalColor(theme.colorScale, 0, theme.foreground) },
        barWidth: '60%',
      }],
      grid: buildGrid({ left: 80 }),
    };
  }
}

chartRegistry.register({
  type: 'horizontal_bar',
  family: 'categorical',
  name: 'Horizontal Bar Chart',
  description: 'Categorical values as horizontal bars',
  renderer: 'echarts',
  compatibleShapes: ['category_numeric', 'generic'],
  requiredColumns: [
    { role: 'category', acceptedTypes: ['category', 'text', 'boolean'], label: 'Category' },
    { role: 'value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Value' },
  ],
  createRenderer: () => new HorizontalBarRenderer(),
});
