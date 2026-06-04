import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { aggregatedCategoryValues } from '@/charts/echarts/aggregatedCategoryValues';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

function pictogramRows(data: DataView, config: ChartConfig): Array<{ name: string; value: number }> {
  return aggregatedCategoryValues(data, config).filter((row) => row.value > 0);
}

class PictogramRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return pictogramRows(data, config).length === 0;
  }

  protected emptyMessage(): string {
    return 'No positive values to display';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const rows = pictogramRows(data, config);
    const axes = buildCartesianAxes(
      theme,
      { type: 'category', data: rows.map((row) => row.name) },
      { type: 'value' },
    );

    return {
      tooltip: buildTooltip('axis'),
      xAxis: axes.xAxis,
      yAxis: axes.yAxis,
      series: [
        {
          type: 'pictorialBar',
          data: rows.map((row, i) => ({
            value: row.value,
            itemStyle: { color: categoricalColor(theme.colorScale, i, theme.foreground) },
          })),
          symbol: 'rect',
          symbolRepeat: true,
          symbolClip: true,
          symbolSize: [12, 8],
          symbolMargin: 2,
        },
      ],
      grid: buildGrid({ left: 56, right: 24, top: 24, bottom: 56 }),
    };
  }
}

chartRegistry.register({
  type: 'pictogram',
  family: 'categorical',
  name: 'Pictogram Chart',
  description: 'Repeated symbols showing category magnitudes',
  renderer: 'echarts',
  compatibleShapes: ['category_numeric', 'generic'],
  requiredColumns: [
    { role: 'category', acceptedTypes: ['category', 'text'], label: 'Category' },
    { role: 'value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Value' },
  ],
  createRenderer: () => new PictogramRenderer(),
});
