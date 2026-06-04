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
  { key: 'minRadius', label: 'Min Radius', control: 'number', default: 6, min: 1, max: 40, step: 1 },
  { key: 'maxRadius', label: 'Max Radius', control: 'number', default: 40, min: 1, max: 100, step: 1 },
  { key: 'opacity', label: 'Opacity', control: 'number', default: 0.7, min: 0.1, max: 1, step: 0.1 },
];

type BubblePoint = [number, number, number];

class BubbleRenderer extends EChartsBaseRenderer {
  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const xCol = config.columns['x'];
    const yCol = config.columns['y'];
    const sizeCol = config.columns['size'];
    const xData = (data.columnArrays[xCol] ?? []) as number[];
    const yData = (data.columnArrays[yCol] ?? []) as number[];
    const sizeData = (data.columnArrays[sizeCol] ?? []) as number[];
    const points: BubblePoint[] = xData.map((x, i) => [x, yData[i], sizeData[i]]);

    const opts = resolveOptions(optionSpecs, config.options);
    const minRadius = opts.minRadius as number;
    const maxRadius = opts.maxRadius as number;
    const opacity = opts.opacity as number;

    // Normalize each point's size value into [minRadius, maxRadius]. When the
    // size column is empty or constant, every bubble falls back to minRadius.
    const sizeMin = sizeData.reduce((a, b) => (a < b ? a : b), Infinity);
    const sizeMax = sizeData.reduce((a, b) => (a > b ? a : b), -Infinity);
    const sizeRange = sizeMax - sizeMin;
    const symbolSize = (val: BubblePoint): number => {
      if (sizeRange <= 0) return minRadius;
      const t = (val[2] - sizeMin) / sizeRange;
      return minRadius + t * (maxRadius - minRadius);
    };

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
        symbolSize,
        itemStyle: { color: categoricalColor(theme.colorScale, 0, theme.foreground), opacity },
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
  type: 'bubble',
  family: 'relationships',
  name: 'Bubble Chart',
  description: 'Three numeric variables as points sized by a third value',
  renderer: 'echarts',
  compatibleShapes: ['three_numeric', 'generic'],
  requiredColumns: [
    { role: 'x', acceptedTypes: ['numeric', 'integer', 'float'], label: 'X Axis' },
    { role: 'y', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Y Axis' },
    { role: 'size', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Size' },
  ],
  options: optionSpecs,
  createRenderer: () => new BubbleRenderer(),
});
