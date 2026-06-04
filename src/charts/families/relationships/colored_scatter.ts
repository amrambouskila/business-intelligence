import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { resolveOptions } from '@/charts/resolve-options';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartOptionSpec } from '@/charts/option-spec';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

const optionSpecs: ChartOptionSpec[] = [
  { key: 'pointSize', label: 'Point Size', control: 'number', default: 6, min: 1, max: 20, step: 1 },
  { key: 'opacity', label: 'Opacity', control: 'number', default: 0.75, min: 0.1, max: 1, step: 0.1 },
];

type GroupedPoint = [number, number];

function finiteGroupedPoints(data: DataView, xCol: string, yCol: string, groupCol: string): Map<string, GroupedPoint[]> {
  const xData = data.columnArrays[xCol] ?? [];
  const yData = data.columnArrays[yCol] ?? [];
  const groupData = data.columnArrays[groupCol] ?? [];
  const groups = new Map<string, GroupedPoint[]>();

  for (let i = 0; i < xData.length; i++) {
    const x = xData[i];
    const y = yData[i];
    if (typeof x !== 'number' || typeof y !== 'number' || !Number.isFinite(x) || !Number.isFinite(y)) continue;
    const group = String(groupData[i] ?? 'Ungrouped');
    const points = groups.get(group) ?? [];
    points.push([x, y]);
    groups.set(group, points);
  }

  return groups;
}

class ColoredScatterRenderer extends EChartsBaseRenderer {
  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const xCol = config.columns['x'];
    const yCol = config.columns['y'];
    const groupCol = config.columns['color_group'];
    const groups = finiteGroupedPoints(data, xCol, yCol, groupCol);
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
      legend: {
        bottom: 0,
        textStyle: { color: theme.foreground, fontSize: theme.fontSize.small },
      },
      xAxis: axes.xAxis,
      yAxis: axes.yAxis,
      series: Array.from(groups.entries()).map(([name, points], index) => ({
        name,
        type: 'scatter',
        data: points,
        symbolSize: pointSize,
        itemStyle: { color: categoricalColor(theme.colorScale, index, theme.foreground), opacity },
        large: true,
        largeThreshold: 5000,
      })),
      grid: buildGrid({ bottom: 70 }),
      dataZoom: [
        { type: 'inside', xAxisIndex: 0 },
        { type: 'inside', yAxisIndex: 0 },
      ],
    };
  }
}

chartRegistry.register({
  type: 'colored_scatter',
  family: 'relationships',
  name: 'Colored Scatter',
  description: 'Two numeric variables plotted as points grouped by color',
  renderer: 'echarts',
  compatibleShapes: ['category_numeric', 'three_numeric', 'many_numeric', 'generic'],
  requiredColumns: [
    { role: 'x', acceptedTypes: ['numeric', 'integer', 'float'], label: 'X Axis' },
    { role: 'y', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Y Axis' },
    { role: 'color_group', acceptedTypes: ['category', 'text'], label: 'Color Group' },
  ],
  options: optionSpecs,
  createRenderer: () => new ColoredScatterRenderer(),
});
