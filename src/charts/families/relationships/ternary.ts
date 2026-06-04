import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

const TRIANGLE_HEIGHT = Math.sqrt(3) / 2;

type TernaryPoint = [number, number, number, number, number];

function ternaryPoints(data: DataView, aCol: string, bCol: string, cCol: string): TernaryPoint[] {
  const aData = data.columnArrays[aCol] ?? [];
  const bData = data.columnArrays[bCol] ?? [];
  const cData = data.columnArrays[cCol] ?? [];
  const points: TernaryPoint[] = [];

  for (let i = 0; i < aData.length; i++) {
    const aRaw = aData[i];
    const bRaw = bData[i];
    const cRaw = cData[i];
    if (typeof aRaw !== 'number' || typeof bRaw !== 'number' || typeof cRaw !== 'number') continue;
    if (!Number.isFinite(aRaw) || !Number.isFinite(bRaw) || !Number.isFinite(cRaw)) continue;
    const sum = aRaw + bRaw + cRaw;
    if (sum <= 0) continue;

    const a = aRaw / sum;
    const b = bRaw / sum;
    const c = cRaw / sum;
    points.push([b + c * 0.5, c * TRIANGLE_HEIGHT, a, b, c]);
  }

  return points;
}

class TernaryRenderer extends EChartsBaseRenderer {
  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const aCol = config.columns['a'];
    const bCol = config.columns['b'];
    const cCol = config.columns['c'];
    const axes = buildCartesianAxes(
      theme,
      { type: 'value', axisLine: false, splitLine: false },
      { type: 'value', axisLine: false, splitLine: false },
    );

    return {
      tooltip: buildTooltip('item'),
      xAxis: { ...(axes.xAxis as Record<string, unknown>), min: 0, max: 1, axisLabel: { show: false } },
      yAxis: { ...(axes.yAxis as Record<string, unknown>), min: 0, max: TRIANGLE_HEIGHT, axisLabel: { show: false } },
      series: [
        {
          name: 'Boundary',
          type: 'line',
          data: [[0, 0], [1, 0], [0.5, TRIANGLE_HEIGHT], [0, 0]],
          showSymbol: false,
          silent: true,
          lineStyle: { color: theme.gridColor, width: 2 },
        },
        {
          name: `${aCol} / ${bCol} / ${cCol}`,
          type: 'scatter',
          data: ternaryPoints(data, aCol, bCol, cCol),
          symbolSize: 7,
          itemStyle: { color: categoricalColor(theme.colorScale, 0, theme.foreground), opacity: 0.8 },
        },
      ],
      grid: buildGrid({ left: 30, right: 30, top: 20, bottom: 30 }),
    };
  }
}

chartRegistry.register({
  type: 'ternary',
  family: 'relationships',
  name: 'Ternary Plot',
  description: 'Compositional triples projected into an equilateral triangle',
  renderer: 'echarts',
  compatibleShapes: ['three_numeric', 'many_numeric', 'generic'],
  requiredColumns: [
    { role: 'a', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Component A' },
    { role: 'b', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Component B' },
    { role: 'c', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Component C' },
  ],
  createRenderer: () => new TernaryRenderer(),
});
