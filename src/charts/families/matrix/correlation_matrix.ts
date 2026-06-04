import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildMatrixGrid, type MatrixGrid } from '@/charts/echarts/matrixGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

function matrixGrid(data: DataView, config: ChartConfig): MatrixGrid {
  return buildMatrixGrid(
    data.columnArrays[config.columns['row']] ?? [],
    data.columnArrays[config.columns['col']] ?? [],
    data.columnArrays[config.columns['value']] ?? [],
  );
}

class CorrelationMatrixRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return matrixGrid(data, config).finiteValues.length === 0;
  }

  protected emptyMessage(): string {
    return 'No correlation values to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const gridData = matrixGrid(data, config);
    const axes = buildCartesianAxes(
      theme,
      { type: 'category', data: gridData.colCategories, splitLine: false },
      { type: 'category', data: gridData.rowCategories, splitLine: false },
    );

    const option: EChartsOption = {
      tooltip: buildTooltip('item'),
      xAxis: axes.xAxis,
      yAxis: axes.yAxis,
      series: [{
        type: 'heatmap',
        data: gridData.cells,
        label: { show: true, color: theme.foreground, fontSize: theme.fontSize.small },
      }],
      grid: buildGrid({ bottom: 70 }),
    };
    option.visualMap = {
      min: Math.min(-1, gridData.min),
      max: Math.max(1, gridData.max),
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: 0,
      inRange: { color: [...theme.divergingScale] },
      textStyle: { color: theme.axisColor },
    };
    return option;
  }
}

chartRegistry.register({
  type: 'correlation_matrix',
  family: 'matrix',
  name: 'Correlation Matrix',
  description: 'Square correlation matrix rendered with a diverging heatmap scale',
  renderer: 'echarts',
  compatibleShapes: ['matrix', 'many_numeric', 'generic'],
  requiredColumns: [
    { role: 'row', acceptedTypes: ['category', 'text', 'integer'], label: 'Row' },
    { role: 'col', acceptedTypes: ['category', 'text', 'integer'], label: 'Column' },
    { role: 'value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Correlation' },
  ],
  createRenderer: () => new CorrelationMatrixRenderer(),
});
