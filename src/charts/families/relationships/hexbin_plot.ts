import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { densityGrid, finiteXY } from '@/charts/echarts/relationshipGrid';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

type HexPoint = [number, number, number];

const HEX_SYMBOL = 'path://M0 -10L8.66 -5L8.66 5L0 10L-8.66 5L-8.66 -5Z';

class HexbinPlotRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return finiteXY(data, config).length === 0;
  }

  protected emptyMessage(): string {
    return 'No x/y points to bin';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const grid = densityGrid(finiteXY(data, config), 16);
    const axes = buildCartesianAxes(
      theme,
      { type: 'value', name: config.columns['x'], nameGap: 30 },
      { type: 'value', name: config.columns['y'], nameGap: 40, axisLine: false },
    );
    const dataPoints: HexPoint[] = grid.cells.map((cell) => [cell.xCenter, cell.yCenter, cell.value]);

    return {
      tooltip: buildTooltip('item'),
      visualMap: {
        min: 0,
        max: grid.maxValue,
        calculable: true,
        orient: 'vertical',
        right: 8,
        top: 30,
        inRange: { color: theme.sequentialScale },
        textStyle: { color: theme.foreground },
      },
      xAxis: axes.xAxis,
      yAxis: axes.yAxis,
      series: [{
        name: 'Hex bins',
        type: 'scatter',
        data: dataPoints,
        symbol: HEX_SYMBOL,
        symbolSize: (point: HexPoint) => 8 + (grid.maxValue <= 0 ? 0 : (point[2] / grid.maxValue) * 18),
        encode: { x: 0, y: 1 },
      }],
      grid: buildGrid({ right: 82, bottom: 50 }),
    };
  }
}

chartRegistry.register({
  type: 'hexbin_plot',
  family: 'relationships',
  name: 'Hexbin Plot',
  description: 'Binned x/y point density rendered as hexagonal markers',
  renderer: 'echarts',
  compatibleShapes: ['two_numeric', 'three_numeric', 'many_numeric', 'generic'],
  requiredColumns: [
    { role: 'x', acceptedTypes: ['numeric', 'integer', 'float'], label: 'X Axis' },
    { role: 'y', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Y Axis' },
  ],
  createRenderer: () => new HexbinPlotRenderer(),
});
