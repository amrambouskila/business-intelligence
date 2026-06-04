import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { finiteXYZ, meanGrid } from '@/charts/echarts/relationshipGrid';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

class ContourPlotRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return finiteXYZ(data, config).length === 0;
  }

  protected emptyMessage(): string {
    return 'No x/y/z grid values to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const grid = meanGrid(finiteXYZ(data, config), 14);

    return {
      tooltip: buildTooltip('item'),
      visualMap: {
        min: grid.minValue,
        max: grid.maxValue,
        type: 'piecewise',
        splitNumber: 6,
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
        name: 'Contour bands',
        type: 'heatmap',
        data: grid.cells.map((cell) => [cell.xIndex, cell.yIndex, cell.value]),
        itemStyle: { borderColor: theme.background, borderWidth: 1 },
      }],
      grid: buildGrid({ right: 112, bottom: 58 }),
    };
  }
}

chartRegistry.register({
  type: 'contour_plot',
  family: 'relationships',
  name: 'Contour Plot',
  description: 'Gridded x/y/z values shown as discrete contour bands',
  renderer: 'echarts',
  compatibleShapes: ['three_numeric', 'many_numeric', 'generic'],
  requiredColumns: [
    { role: 'x', acceptedTypes: ['numeric', 'integer', 'float'], label: 'X Axis' },
    { role: 'y', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Y Axis' },
    { role: 'z', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Z Value' },
  ],
  createRenderer: () => new ContourPlotRenderer(),
});
