import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { resolveOptions } from '@/charts/resolve-options';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartOptionSpec } from '@/charts/option-spec';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

const optionSpecs: ChartOptionSpec[] = [
  { key: 'pointSize', label: 'Point Size', control: 'number', default: 6, min: 1, max: 20, step: 1 },
  { key: 'opacity', label: 'Opacity', control: 'number', default: 0.7, min: 0.1, max: 1, step: 0.1 },
];

class ScatterRenderer extends EChartsBaseRenderer {
  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const xCol = config.columns['x'];
    const yCol = config.columns['y'];
    const xData = (data.columnArrays[xCol] ?? []) as number[];
    const yData = (data.columnArrays[yCol] ?? []) as number[];
    const points = xData.map((x, i) => [x, yData[i]]);

    const opts = resolveOptions(optionSpecs, config.options);
    const pointSize = opts.pointSize as number;
    const opacity = opts.opacity as number;
    const axes = buildCartesianAxes(
      theme,
      { type: 'value', name: xCol, nameGap: 30 },
      { type: 'value', name: yCol, nameGap: 40, axisLine: false },
    );

    return {
      tooltip: buildTooltip('item'),
      xAxis: axes.xAxis,
      yAxis: axes.yAxis,
      series: [{
        type: 'scatter',
        data: points,
        symbolSize: pointSize,
        itemStyle: { color: categoricalColor(theme.colorScale, 0, theme.foreground), opacity },
        large: true,
        largeThreshold: 5000,
      }],
      grid: buildGrid({ bottom: 50 }),
      dataZoom: [
        { type: 'inside', xAxisIndex: 0 },
        { type: 'inside', yAxisIndex: 0 },
      ],
    };
  }
}

chartRegistry.register({
  type: 'scatter',
  family: 'relationships',
  name: 'Scatter Plot',
  description: 'Two numeric variables plotted as points',
  renderer: 'echarts',
  compatibleShapes: ['two_numeric', 'three_numeric', 'many_numeric', 'generic'],
  requiredColumns: [
    { role: 'x', acceptedTypes: ['numeric', 'integer', 'float'], label: 'X Axis' },
    { role: 'y', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Y Axis' },
  ],
  options: optionSpecs,
  createRenderer: () => new ScatterRenderer(),
});
