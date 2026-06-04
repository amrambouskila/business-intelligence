import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildMatrixGrid } from '@/charts/echarts/matrixGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

function tileGrid(data: DataView, config: ChartConfig) {
  return buildMatrixGrid(
    data.columnArrays[config.columns['row']] ?? [],
    data.columnArrays[config.columns['col']] ?? [],
    data.columnArrays[config.columns['value']] ?? [],
  );
}

class TileMapRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return tileGrid(data, config).finiteValues.length === 0;
  }

  protected emptyMessage(): string {
    return 'No tile values to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const gridData = tileGrid(data, config);
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
        itemStyle: { borderColor: theme.background, borderWidth: 2 },
      }],
      grid: buildGrid({ bottom: 60 }),
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
  type: 'tile_map',
  family: 'matrix',
  name: 'Tile Map',
  description: 'Rectangular tile grid colored by value',
  renderer: 'echarts',
  compatibleShapes: ['matrix', 'generic'],
  requiredColumns: [
    { role: 'row', acceptedTypes: ['category', 'text', 'integer'], label: 'Row' },
    { role: 'col', acceptedTypes: ['category', 'text', 'integer'], label: 'Column' },
    { role: 'value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Value' },
  ],
  createRenderer: () => new TileMapRenderer(),
});
