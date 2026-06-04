import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

interface DependencePoint {
  featureValue: number;
  shapValue: number;
}

function dependencePoints(data: DataView, config: ChartConfig): DependencePoint[] {
  const featureValues = data.columnArrays[config.columns['feature_value']] ?? [];
  const shapValues = data.columnArrays[config.columns['shap_value']] ?? [];
  const n = Math.min(featureValues.length, shapValues.length);
  const points: DependencePoint[] = [];

  for (let i = 0; i < n; i++) {
    const featureValue = featureValues[i];
    const shapValue = shapValues[i];
    if (typeof featureValue === 'number' && Number.isFinite(featureValue)
      && typeof shapValue === 'number' && Number.isFinite(shapValue)) {
      points.push({ featureValue, shapValue });
    }
  }

  return points.sort((a, b) => a.featureValue - b.featureValue || a.shapValue - b.shapValue);
}

class ShapDependencePlotRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return dependencePoints(data, config).length === 0;
  }

  protected emptyMessage(): string {
    return 'No SHAP dependence values to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const points = dependencePoints(data, config);
    const axes = buildCartesianAxes(
      theme,
      { type: 'value', name: config.columns['feature_value'], nameGap: 34 },
      { type: 'value', name: 'SHAP value', axisLine: false, nameGap: 42 },
    );

    return {
      tooltip: buildTooltip('item'),
      xAxis: axes.xAxis,
      yAxis: axes.yAxis,
      series: [{
        type: 'scatter',
        data: points.map((point) => [point.featureValue, point.shapValue]),
        symbolSize: 8,
        itemStyle: { color: categoricalColor(theme.colorScale, 0, theme.foreground), opacity: 0.72 },
      }],
      grid: buildGrid({ bottom: 55 }),
    };
  }
}

chartRegistry.register({
  type: 'shap_dependence_plot',
  family: 'statistical',
  name: 'SHAP Dependence Plot',
  description: 'Feature values plotted against their SHAP contribution',
  renderer: 'echarts',
  compatibleShapes: ['two_numeric', 'category_numeric', 'generic'],
  requiredColumns: [
    { role: 'feature_value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Feature value' },
    { role: 'shap_value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'SHAP value' },
  ],
  createRenderer: () => new ShapDependencePlotRenderer(),
});
