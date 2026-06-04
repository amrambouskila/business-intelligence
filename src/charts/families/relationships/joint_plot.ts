import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { histogramBins } from '@/charts/echarts/histogramBins';
import { finiteXY } from '@/charts/echarts/relationshipGrid';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

class JointPlotRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return finiteXY(data, config).length === 0;
  }

  protected emptyMessage(): string {
    return 'No x/y points to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const points = finiteXY(data, config);
    const xBins = histogramBins(points.map((point) => point[0]), 12);
    const yBins = histogramBins(points.map((point) => point[1]), 12);
    const pointColor = categoricalColor(theme.colorScale, 0, theme.foreground);
    const histColor = categoricalColor(theme.colorScale, 1, theme.foreground);

    return {
      tooltip: buildTooltip('item'),
      grid: [
        { left: 70, right: 96, top: 130, bottom: 55 },
        { left: 70, right: 96, top: 28, height: 82 },
        { right: 28, top: 130, bottom: 55, width: 68 },
      ],
      xAxis: [
        { type: 'value', name: config.columns['x'], gridIndex: 0, axisLabel: { color: theme.axisColor }, splitLine: { lineStyle: { color: theme.gridColor } } },
        { type: 'value', gridIndex: 1, axisLabel: { show: false }, axisLine: { lineStyle: { color: theme.gridColor } }, splitLine: { show: false } },
        { type: 'value', gridIndex: 2, axisLabel: { show: false }, axisLine: { lineStyle: { color: theme.gridColor } }, splitLine: { show: false } },
      ],
      yAxis: [
        { type: 'value', name: config.columns['y'], gridIndex: 0, axisLabel: { color: theme.axisColor }, splitLine: { lineStyle: { color: theme.gridColor } } },
        { type: 'value', gridIndex: 1, axisLabel: { color: theme.axisColor }, splitLine: { lineStyle: { color: theme.gridColor } } },
        { type: 'value', gridIndex: 2, axisLabel: { color: theme.axisColor }, axisLine: { lineStyle: { color: theme.gridColor } }, splitLine: { show: false } },
      ],
      series: [
        { name: 'Points', type: 'scatter', xAxisIndex: 0, yAxisIndex: 0, data: points, symbolSize: 5, itemStyle: { color: pointColor, opacity: 0.7 } },
        { name: 'X distribution', type: 'bar', xAxisIndex: 1, yAxisIndex: 1, data: xBins.binCenters.map((x, i) => [x, xBins.counts[i]]), itemStyle: { color: histColor, opacity: 0.75 } },
        { name: 'Y distribution', type: 'bar', xAxisIndex: 2, yAxisIndex: 2, data: yBins.binCenters.map((y, i) => [yBins.counts[i], y]), itemStyle: { color: histColor, opacity: 0.75 } },
      ],
    };
  }
}

chartRegistry.register({
  type: 'joint_plot',
  family: 'relationships',
  name: 'Joint Plot',
  description: 'Scatter plot with marginal x and y distributions',
  renderer: 'echarts',
  compatibleShapes: ['two_numeric', 'three_numeric', 'many_numeric', 'generic'],
  requiredColumns: [
    { role: 'x', acceptedTypes: ['numeric', 'integer', 'float'], label: 'X Axis' },
    { role: 'y', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Y Axis' },
  ],
  createRenderer: () => new JointPlotRenderer(),
});
