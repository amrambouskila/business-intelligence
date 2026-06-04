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
    data.columnArrays[config.columns['intensity']] ?? [],
  );
}

class ImageRasterPlotRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return matrixGrid(data, config).finiteValues.length === 0;
  }

  protected emptyMessage(): string {
    return 'No raster intensities to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const gridData = matrixGrid(data, config);
    const axes = buildCartesianAxes(
      theme,
      { type: 'category', data: gridData.colCategories, splitLine: false },
      { type: 'category', data: gridData.rowCategories, splitLine: false, inverse: true },
    );

    const option: EChartsOption = {
      tooltip: buildTooltip('item'),
      xAxis: axes.xAxis,
      yAxis: axes.yAxis,
      series: [{ type: 'heatmap', data: gridData.cells, progressive: 0 }],
      grid: buildGrid({ left: 70, bottom: 70 }),
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
  type: 'image_raster_plot',
  family: 'matrix',
  name: 'Image / Raster Plot',
  description: 'Row and column pixel coordinates encoded by intensity',
  renderer: 'echarts',
  compatibleShapes: ['matrix', 'generic'],
  requiredColumns: [
    { role: 'row', acceptedTypes: ['category', 'text', 'integer'], label: 'Row' },
    { role: 'col', acceptedTypes: ['category', 'text', 'integer'], label: 'Column' },
    { role: 'intensity', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Intensity' },
  ],
  createRenderer: () => new ImageRasterPlotRenderer(),
});
