import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

interface ShapPoint {
  feature: string;
  shapValue: number;
  featureValue: number;
}

function shapPoints(data: DataView, config: ChartConfig): ShapPoint[] {
  const features = data.columnArrays[config.columns['feature']] ?? [];
  const shapValues = data.columnArrays[config.columns['shap_value']] ?? [];
  const featureValues = data.columnArrays[config.columns['feature_value']] ?? [];
  const n = Math.min(features.length, shapValues.length, featureValues.length);
  const points: ShapPoint[] = [];

  for (let i = 0; i < n; i++) {
    const shapValue = shapValues[i];
    const featureValue = featureValues[i];
    if (typeof shapValue === 'number' && Number.isFinite(shapValue)
      && typeof featureValue === 'number' && Number.isFinite(featureValue)) {
      points.push({ feature: String(features[i]), shapValue, featureValue });
    }
  }

  return points;
}

function featureOrder(points: ShapPoint[]): string[] {
  const totals = new Map<string, { sum: number; count: number }>();
  for (const point of points) {
    const current = totals.get(point.feature) ?? { sum: 0, count: 0 };
    current.sum += Math.abs(point.shapValue);
    current.count += 1;
    totals.set(point.feature, current);
  }

  return Array.from(totals.entries())
    .sort((a, b) => (b[1].sum / b[1].count) - (a[1].sum / a[1].count) || a[0].localeCompare(b[0]))
    .map(([feature]) => feature);
}

function offsetFor(index: number): number {
  if (index === 0) return 0;
  const ring = Math.ceil(index / 2);
  return (index % 2 === 1 ? 1 : -1) * ring * 0.1;
}

function seriesData(points: ShapPoint[], features: string[]): number[][] {
  const featureIndex = new Map(features.map((feature, i) => [feature, i]));
  const counts = new Map<string, number>();

  return [...points]
    .sort((a, b) => a.feature.localeCompare(b.feature) || a.shapValue - b.shapValue)
    .map((point) => {
      const count = counts.get(point.feature) ?? 0;
      counts.set(point.feature, count + 1);
      return [point.shapValue, featureIndex.get(point.feature)! + offsetFor(count), point.featureValue];
    });
}

class ShapSummaryBeeswarmRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return shapPoints(data, config).length === 0;
  }

  protected emptyMessage(): string {
    return 'No SHAP values to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const points = shapPoints(data, config);
    const features = featureOrder(points);
    const axes = buildCartesianAxes(
      theme,
      { type: 'value', name: 'SHAP value', nameGap: 34 },
      { type: 'value', axisLine: false },
    );

    return {
      tooltip: buildTooltip('item'),
      xAxis: axes.xAxis,
      yAxis: {
        ...(axes.yAxis as Record<string, unknown>),
        min: -0.5,
        max: Math.max(features.length - 0.5, 0.5),
        axisLabel: {
          color: theme.axisColor,
          fontSize: theme.fontSize.small,
          formatter: (value: number) => features[Math.round(value)] ?? '',
        },
      } as EChartsOption['yAxis'],
      series: [{
        type: 'scatter',
        data: seriesData(points, features),
        symbolSize: 7,
        encode: { x: 0, y: 1, tooltip: [0, 2] },
        itemStyle: { color: categoricalColor(theme.colorScale, 0, theme.foreground), opacity: 0.72 },
      }],
      grid: buildGrid({ left: 120, bottom: 55 }),
    };
  }
}

chartRegistry.register({
  type: 'shap_summary_beeswarm',
  family: 'statistical',
  name: 'SHAP Summary Beeswarm',
  description: 'Feature-level SHAP values spread into deterministic beeswarm rows',
  renderer: 'echarts',
  compatibleShapes: ['category_numeric', 'generic'],
  requiredColumns: [
    { role: 'feature', acceptedTypes: ['category', 'text'], label: 'Feature' },
    { role: 'shap_value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'SHAP value' },
    { role: 'feature_value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Feature value' },
  ],
  createRenderer: () => new ShapSummaryBeeswarmRenderer(),
});
