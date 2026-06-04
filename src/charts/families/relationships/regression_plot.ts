import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

type Point = [number, number];

function finitePoints(data: DataView, xCol: string, yCol: string): Point[] {
  const xData = data.columnArrays[xCol] ?? [];
  const yData = data.columnArrays[yCol] ?? [];
  const points: Point[] = [];

  for (let i = 0; i < xData.length; i++) {
    const x = xData[i];
    const y = yData[i];
    if (typeof x === 'number' && typeof y === 'number' && Number.isFinite(x) && Number.isFinite(y)) {
      points.push([x, y]);
    }
  }

  return points;
}

function regressionLine(points: Point[]): Point[] {
  if (points.length === 0) return [];

  let sumX = 0;
  let sumY = 0;
  let minX = Infinity;
  let maxX = -Infinity;
  for (const [x, y] of points) {
    sumX += x;
    sumY += y;
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
  }

  const meanX = sumX / points.length;
  const meanY = sumY / points.length;
  let numerator = 0;
  let denominator = 0;
  for (const [x, y] of points) {
    numerator += (x - meanX) * (y - meanY);
    denominator += (x - meanX) ** 2;
  }

  const slope = denominator > 0 ? numerator / denominator : 0;
  const intercept = meanY - slope * meanX;
  return [[minX, slope * minX + intercept], [maxX, slope * maxX + intercept]];
}

class RegressionPlotRenderer extends EChartsBaseRenderer {
  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const xCol = config.columns['x'];
    const yCol = config.columns['y'];
    const points = finitePoints(data, xCol, yCol);
    const axes = buildCartesianAxes(
      theme,
      { type: 'value', name: xCol, nameGap: 30 },
      { type: 'value', name: yCol, nameGap: 40, axisLine: false },
    );

    return {
      tooltip: buildTooltip('item'),
      xAxis: axes.xAxis,
      yAxis: axes.yAxis,
      series: [
        {
          name: 'Observed',
          type: 'scatter',
          data: points,
          symbolSize: 6,
          itemStyle: { color: categoricalColor(theme.colorScale, 0, theme.foreground), opacity: 0.75 },
        },
        {
          name: 'Linear fit',
          type: 'line',
          data: regressionLine(points),
          showSymbol: false,
          lineStyle: { color: categoricalColor(theme.colorScale, 1, theme.foreground), width: 2 },
        },
      ],
      grid: buildGrid({ bottom: 50 }),
      dataZoom: [
        { type: 'inside', xAxisIndex: 0 },
        { type: 'inside', yAxisIndex: 0 },
      ],
    };
  }
}

chartRegistry.register({
  type: 'regression_plot',
  family: 'relationships',
  name: 'Regression Plot',
  description: 'Scatter plot with an ordinary least-squares trend line',
  renderer: 'echarts',
  compatibleShapes: ['two_numeric', 'three_numeric', 'many_numeric', 'generic'],
  requiredColumns: [
    { role: 'x', acceptedTypes: ['numeric', 'integer', 'float'], label: 'X Axis' },
    { role: 'y', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Y Axis' },
  ],
  createRenderer: () => new RegressionPlotRenderer(),
});
