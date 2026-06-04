import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { aggregatedCategoryValues } from '@/charts/echarts/aggregatedCategoryValues';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

class LollipopRenderer extends EChartsBaseRenderer {
  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const pairs = aggregatedCategoryValues(data, config);
    const names = pairs.map((p) => p.name);
    const values = pairs.map((p) => p.value);
    const color = categoricalColor(theme.colorScale, 0, theme.foreground);

    const axes = buildCartesianAxes(theme, { type: 'category', data: names }, { type: 'value', axisLine: false });

    return {
      tooltip: buildTooltip('axis'),
      xAxis: axes.xAxis,
      yAxis: axes.yAxis,
      series: [
        { type: 'bar', data: values, barWidth: 3, itemStyle: { color } },
        { type: 'scatter', data: values, symbolSize: 12, itemStyle: { color } },
      ],
      grid: buildGrid(),
    };
  }

  protected override isEmpty(data: DataView, config: ChartConfig): boolean {
    return aggregatedCategoryValues(data, config).length === 0;
  }

  protected override emptyMessage(): string {
    return 'No finite values to display';
  }
}

chartRegistry.register({
  type: 'lollipop',
  family: 'categorical',
  name: 'Lollipop Chart',
  description: 'Category values drawn as thin stems topped with dots',
  renderer: 'echarts',
  compatibleShapes: ['category_numeric', 'generic'],
  requiredColumns: [
    { role: 'category', acceptedTypes: ['category', 'text'], label: 'Category' },
    { role: 'value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Value' },
  ],
  createRenderer: () => new LollipopRenderer(),
});
