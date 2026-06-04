import type { EChartsOption, DefaultLabelFormatterCallbackParams } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildMatrixGrid } from '@/charts/echarts/matrixGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

function classificationGrid(data: DataView, config: ChartConfig) {
  return buildMatrixGrid(
    data.columnArrays[config.columns['actual']] ?? [],
    data.columnArrays[config.columns['predicted']] ?? [],
    data.columnArrays[config.columns['count']] ?? [],
  );
}

class ConfusionMatrixChartRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return classificationGrid(data, config).finiteValues.length === 0;
  }

  protected emptyMessage(): string {
    return 'No classification counts to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const gridData = classificationGrid(data, config);
    const axes = buildCartesianAxes(
      theme,
      { type: 'category', data: gridData.colCategories, name: 'Predicted', splitLine: false },
      { type: 'category', data: gridData.rowCategories, name: 'Actual', splitLine: false },
    );
    const option: EChartsOption = {
      tooltip: buildTooltip('item'),
      xAxis: axes.xAxis,
      yAxis: axes.yAxis,
      series: [{
        type: 'heatmap',
        data: gridData.cells,
        label: {
          show: true,
          color: theme.foreground,
          formatter: (params: DefaultLabelFormatterCallbackParams) => String((params.value as [number, number, number])[2]),
        },
      }],
      grid: buildGrid({ bottom: 70, left: 70 }),
    };
    option.visualMap = {
      min: gridData.min,
      max: gridData.max,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: 0,
      inRange: { color: [...theme.sequentialScale] },
      textStyle: { color: theme.axisColor },
    };
    return option;
  }
}

chartRegistry.register({
  type: 'confusion_matrix_chart',
  family: 'statistical',
  name: 'Confusion Matrix Chart',
  description: 'Classification actual-versus-predicted counts for model evaluation',
  renderer: 'echarts',
  compatibleShapes: ['matrix', 'category_numeric', 'generic'],
  requiredColumns: [
    { role: 'actual', acceptedTypes: ['category', 'text', 'integer'], label: 'Actual' },
    { role: 'predicted', acceptedTypes: ['category', 'text', 'integer'], label: 'Predicted' },
    { role: 'count', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Count' },
  ],
  createRenderer: () => new ConfusionMatrixChartRenderer(),
});
