import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { aggregatedCategoryValues } from '@/charts/echarts/aggregatedCategoryValues';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

class DonutRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return aggregatedCategoryValues(data, config).length === 0;
  }

  protected emptyMessage(): string {
    return 'No values to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const slices = aggregatedCategoryValues(data, config).map((s, i) => ({
      name: s.name,
      value: s.value,
      itemStyle: { color: categoricalColor(theme.colorScale, i, theme.foreground) },
    }));

    return {
      tooltip: buildTooltip('item'),
      series: [{ type: 'pie', radius: ['40%', '70%'], data: slices }],
    };
  }
}

chartRegistry.register({
  type: 'donut',
  family: 'composition',
  name: 'Donut Chart',
  description: 'Proportions of a whole as a ring of slices',
  renderer: 'echarts',
  compatibleShapes: ['category_numeric', 'generic'],
  requiredColumns: [
    { role: 'category', acceptedTypes: ['category', 'text'], label: 'Category' },
    { role: 'value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Value' },
  ],
  createRenderer: () => new DonutRenderer(),
});
