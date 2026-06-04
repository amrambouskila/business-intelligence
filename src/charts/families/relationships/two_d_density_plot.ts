import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { densityGrid, finiteXY } from '@/charts/echarts/relationshipGrid';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

class TwoDDensityPlotRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return finiteXY(data, config).length === 0;
  }

  protected emptyMessage(): string {
    return 'No x/y points to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const grid = densityGrid(finiteXY(data, config), 18);

    return {
      tooltip: buildTooltip('item'),
      visualMap: {
        min: 0,
        max: grid.maxValue,
        calculable: true,
        right: 8,
        top: 30,
        inRange: { color: theme.sequentialScale },
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
        name: 'Density',
        type: 'heatmap',
        data: grid.cells.map((cell) => [cell.xIndex, cell.yIndex, cell.value]),
        emphasis: { itemStyle: { borderColor: theme.foreground, borderWidth: 1 } },
      }],
      grid: buildGrid({ right: 90, bottom: 58 }),
    };
  }
}

chartRegistry.register({
  type: 'two_d_density_plot',
  family: 'relationships',
  name: '2D Density Plot',
  description: 'Two-dimensional point density estimated with equal-width bins',
  renderer: 'echarts',
  compatibleShapes: ['two_numeric', 'three_numeric', 'many_numeric', 'generic'],
  requiredColumns: [
    { role: 'x', acceptedTypes: ['numeric', 'integer', 'float'], label: 'X Axis' },
    { role: 'y', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Y Axis' },
  ],
  createRenderer: () => new TwoDDensityPlotRenderer(),
});
