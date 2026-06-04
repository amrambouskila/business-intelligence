import type { EChartsOption, DefaultLabelFormatterCallbackParams } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

function finiteCellCount(data: DataView, config: ChartConfig): number {
  const valueData = (data.columnArrays[config.columns['value']] ?? []) as number[];
  return valueData.filter((v) => Number.isFinite(v)).length;
}

class AnnotatedHeatmapRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return finiteCellCount(data, config) === 0;
  }

  protected emptyMessage(): string {
    return 'No matrix values to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const rowCol = config.columns['row'];
    const colCol = config.columns['col'];
    const valueCol = config.columns['value'];
    const rowData = (data.columnArrays[rowCol] ?? []).map(String);
    const colData = (data.columnArrays[colCol] ?? []).map(String);
    const valueData = (data.columnArrays[valueCol] ?? []) as number[];

    const rowCategories = [...new Set(rowData)];
    const colCategories = [...new Set(colData)];
    const rowIndex = new Map(rowCategories.map((r, i) => [r, i]));
    const colIndex = new Map(colCategories.map((c, i) => [c, i]));

    // row/col are always present in the index maps (built from the same data).
    const cells = rowData.map((r, i) => [colIndex.get(colData[i])!, rowIndex.get(r)!, valueData[i]]);

    // reduce (not spread) so min/max never overflow the call stack on large arrays.
    const finiteValues = valueData.filter((v): v is number => Number.isFinite(v));
    const hasValues = finiteValues.length > 0;
    const min = hasValues ? finiteValues.reduce((a, b) => (a < b ? a : b), Infinity) : 0;
    const max = hasValues ? finiteValues.reduce((a, b) => (a > b ? a : b), -Infinity) : 1;

    const axes = buildCartesianAxes(
      theme,
      { type: 'category', data: colCategories, splitLine: false },
      { type: 'category', data: rowCategories, splitLine: false },
    );

    const option: EChartsOption = {
      tooltip: buildTooltip('item'),
      xAxis: axes.xAxis,
      yAxis: axes.yAxis,
      series: [{
        type: 'heatmap',
        data: cells,
        label: {
          show: true,
          color: theme.foreground,
          formatter: (params: DefaultLabelFormatterCallbackParams) => {
            const cell = params.value as [number, number, number];
            return String(cell[2]);
          },
        },
      }],
      grid: buildGrid({ bottom: 60 }),
    };
    option.visualMap = {
      min,
      max,
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
  type: 'annotated_heatmap',
  family: 'matrix',
  name: 'Annotated Heatmap',
  description: 'Matrix heatmap with the numeric value drawn in each cell',
  renderer: 'echarts',
  compatibleShapes: ['matrix', 'generic'],
  requiredColumns: [
    { role: 'row', acceptedTypes: ['category', 'text', 'integer'], label: 'Row' },
    { role: 'col', acceptedTypes: ['category', 'text', 'integer'], label: 'Column' },
    { role: 'value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Value' },
  ],
  createRenderer: () => new AnnotatedHeatmapRenderer(),
});
