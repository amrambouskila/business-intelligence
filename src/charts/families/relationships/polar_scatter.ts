import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

type PolarPoint = [number, number];

function finitePolarPoints(data: DataView, thetaCol: string, rCol: string): PolarPoint[] {
  const thetaData = data.columnArrays[thetaCol] ?? [];
  const rData = data.columnArrays[rCol] ?? [];
  const points: PolarPoint[] = [];

  for (let i = 0; i < thetaData.length; i++) {
    const theta = thetaData[i];
    const r = rData[i];
    if (typeof theta === 'number' && typeof r === 'number' && Number.isFinite(theta) && Number.isFinite(r)) {
      points.push([r, theta]);
    }
  }

  return points;
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

class PolarScatterRenderer extends EChartsBaseRenderer {
  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const thetaCol = config.columns['theta'];
    const rCol = config.columns['r'];
    const axes = polarAxes(theme);

    return {
      tooltip: buildTooltip('item'),
      ...axes,
      series: [{
        type: 'scatter',
        coordinateSystem: 'polar',
        data: finitePolarPoints(data, thetaCol, rCol),
        symbolSize: 6,
        itemStyle: { color: categoricalColor(theme.colorScale, 0, theme.foreground), opacity: 0.75 },
      }],
    };
  }
}

chartRegistry.register({
  type: 'polar_scatter',
  family: 'relationships',
  name: 'Polar Scatter',
  description: 'Radius and angle observations plotted in polar coordinates',
  renderer: 'echarts',
  compatibleShapes: ['two_numeric', 'three_numeric', 'many_numeric', 'generic'],
  requiredColumns: [
    { role: 'theta', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Theta' },
    { role: 'r', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Radius' },
  ],
  createRenderer: () => new PolarScatterRenderer(),
});
