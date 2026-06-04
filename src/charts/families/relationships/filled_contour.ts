import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { finiteXYZ, meanGrid } from '@/charts/echarts/relationshipGrid';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

class FilledContourRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return finiteXYZ(data, config).length === 0;
  }

  protected emptyMessage(): string {
    return 'No x/y/z grid values to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const grid = meanGrid(finiteXYZ(data, config), 18);

    return {
      tooltip: buildTooltip('item'),
      visualMap: {
        min: grid.minValue,
        max: grid.maxValue,
        calculable: true,
        right: 8,
        top: 30,
        inRange: { color: theme.divergingScale },
        textStyle: { color: theme.foreground },
      },
      xAxis: {
        type: 'category',
        name: config.columns['x'],
        data: grid.xLabels,
        axisLabel: { color: theme.axisColor, fontSize: theme.fontSize.small },
        axisLine: { lineStyle: { color: theme.gridColor } },
      },
      yAxis: {
        type: 'category',
        name: config.columns['y'],
        data: grid.yLabels,
        axisLabel: { color: theme.axisColor, fontSize: theme.fontSize.small },
        splitLine: { lineStyle: { color: theme.gridColor } },
      },
      series: [{
        name: 'Filled contours',
        type: 'heatmap',
        data: grid.cells.map((cell) => [cell.xIndex, cell.yIndex, cell.value]),
        itemStyle: { borderWidth: 0 },
      }],
      grid: buildGrid({ right: 90, bottom: 58 }),
    };
  }
}

chartRegistry.register({
  type: 'filled_contour',
  family: 'relationships',
  name: 'Filled Contour',
  description: 'Gridded x/y/z values shown as filled contour-like color bands',
  renderer: 'echarts',
  compatibleShapes: ['three_numeric', 'many_numeric', 'generic'],
  requiredColumns: [
    { role: 'x', acceptedTypes: ['numeric', 'integer', 'float'], label: 'X Axis' },
    { role: 'y', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Y Axis' },
    { role: 'z', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Z Value' },
  ],
  createRenderer: () => new FilledContourRenderer(),
});
