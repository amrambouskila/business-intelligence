import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

type PolarPoint = [number, number];

function sortedPolarPoints(data: DataView, thetaCol: string, rCol: string): PolarPoint[] {
  const thetaData = data.columnArrays[thetaCol] ?? [];
  const rData = data.columnArrays[rCol] ?? [];
  const points: Array<{ theta: number; point: PolarPoint }> = [];

  for (let i = 0; i < thetaData.length; i++) {
    const theta = thetaData[i];
    const r = rData[i];
    if (typeof theta !== 'number' || typeof r !== 'number' || !Number.isFinite(theta) || !Number.isFinite(r)) continue;
    points.push({ theta, point: [r, theta] });
  }

  return points.sort((a, b) => a.theta - b.theta).map(({ point }) => point);
}

function polarAxes(theme: ThemeTokens): Pick<EChartsOption, 'angleAxis' | 'radiusAxis' | 'polar'> {
  const axisLabel = { color: theme.axisColor, fontSize: theme.fontSize.small };
  return {
    polar: {},
    angleAxis: {
      type: 'value',
      axisLabel,
      axisLine: { lineStyle: { color: theme.gridColor } },
      splitLine: { lineStyle: { color: theme.gridColor } },
    },
    radiusAxis: {
      type: 'value',
      axisLabel,
      axisLine: { lineStyle: { color: theme.gridColor } },
      splitLine: { lineStyle: { color: theme.gridColor } },
    },
  };
}

class PolarLineRenderer extends EChartsBaseRenderer {
  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const thetaCol = config.columns['theta'];
    const rCol = config.columns['r'];
    const axes = polarAxes(theme);

    return {
      tooltip: buildTooltip('axis'),
      ...axes,
      series: [{
        type: 'line',
        coordinateSystem: 'polar',
        data: sortedPolarPoints(data, thetaCol, rCol),
        showSymbol: false,
        lineStyle: { color: categoricalColor(theme.colorScale, 0, theme.foreground), width: 2 },
      }],
    };
  }
}

chartRegistry.register({
  type: 'polar_line',
  family: 'relationships',
  name: 'Polar Line',
  description: 'Ordered radius and angle values connected in polar coordinates',
  renderer: 'echarts',
  compatibleShapes: ['two_numeric', 'three_numeric', 'many_numeric', 'generic'],
  requiredColumns: [
    { role: 'theta', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Theta' },
    { role: 'r', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Radius' },
  ],
  createRenderer: () => new PolarLineRenderer(),
});
