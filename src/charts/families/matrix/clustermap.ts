import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildMatrixGrid, reorderMatrixGrid, type MatrixGrid } from '@/charts/echarts/matrixGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

function baseGrid(data: DataView, config: ChartConfig): MatrixGrid {
  return buildMatrixGrid(
    data.columnArrays[config.columns['row']] ?? [],
    data.columnArrays[config.columns['col']] ?? [],
    data.columnArrays[config.columns['value']] ?? [],
  );
}

function meanOrder(categories: string[], cells: Array<[number, number, number]>, axis: 'row' | 'col'): string[] {
  const sums = categories.map(() => ({ sum: 0, count: 0 }));
  for (const [col, row, value] of cells) {
    if (Number.isFinite(value)) {
      const idx = axis === 'row' ? row : col;
      sums[idx].sum += value;
      sums[idx].count += 1;
    }
  }
  return categories
    .map((name, index) => ({ name, mean: sums[index].count > 0 ? sums[index].sum / sums[index].count : -Infinity }))
    .sort((a, b) => b.mean - a.mean || a.name.localeCompare(b.name))
    .map((entry) => entry.name);
}

function clusteredGrid(data: DataView, config: ChartConfig): MatrixGrid {
  const grid = baseGrid(data, config);
  return reorderMatrixGrid(
    grid,
    meanOrder(grid.rowCategories, grid.cells, 'row'),
    meanOrder(grid.colCategories, grid.cells, 'col'),
  );
}

class ClustermapRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return baseGrid(data, config).finiteValues.length === 0;
  }

  protected emptyMessage(): string {
    return 'No clustermap values to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const gridData = clusteredGrid(data, config);
    const axes = buildCartesianAxes(
      theme,
      { type: 'category', data: gridData.colCategories, splitLine: false },
      { type: 'category', data: gridData.rowCategories, splitLine: false },
    );
    const option: EChartsOption = {
      tooltip: buildTooltip('item'),
      xAxis: axes.xAxis,
      yAxis: axes.yAxis,
      series: [{ type: 'heatmap', data: gridData.cells }],
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
  type: 'clustermap',
  family: 'matrix',
  name: 'Clustermap',
  description: 'Matrix heatmap ordered by row and column intensity',
  renderer: 'echarts',
  compatibleShapes: ['matrix', 'generic'],
  requiredColumns: [
    { role: 'row', acceptedTypes: ['category', 'text', 'integer'], label: 'Row' },
    { role: 'col', acceptedTypes: ['category', 'text', 'integer'], label: 'Column' },
    { role: 'value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Value' },
  ],
  createRenderer: () => new ClustermapRenderer(),
});
