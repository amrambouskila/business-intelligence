import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

interface DependenceRow {
  featureValue: number;
  predicted: number;
}

function dependenceRows(data: DataView, config: ChartConfig): DependenceRow[] {
  const featureValues = data.columnArrays[config.columns['feature_value']] ?? [];
  const predictions = data.columnArrays[config.columns['predicted']] ?? [];
  const n = Math.min(featureValues.length, predictions.length);
  const buckets = new Map<number, { sum: number; count: number }>();

  for (let i = 0; i < n; i++) {
    const featureValue = featureValues[i];
    const predicted = predictions[i];
    if (typeof featureValue === 'number' && Number.isFinite(featureValue)
      && typeof predicted === 'number' && Number.isFinite(predicted)) {
      const bucket = buckets.get(featureValue) ?? { sum: 0, count: 0 };
      bucket.sum += predicted;
      bucket.count += 1;
      buckets.set(featureValue, bucket);
    }
  }

  return Array.from(buckets.entries())
    .map(([featureValue, bucket]) => ({ featureValue, predicted: +(bucket.sum / bucket.count).toFixed(6) }))
    .sort((a, b) => a.featureValue - b.featureValue);
}

class PartialDependencePlotRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return dependenceRows(data, config).length === 0;
  }

  protected emptyMessage(): string {
    return 'No partial dependence values to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const rows = dependenceRows(data, config);
    const color = categoricalColor(theme.colorScale, 0, theme.foreground);
    const axes = buildCartesianAxes(
      theme,
      { type: 'value', name: config.columns['feature_value'], nameGap: 34 },
      { type: 'value', name: 'Predicted', axisLine: false, nameGap: 42 },
    );

    return {
      tooltip: buildTooltip('axis'),
      xAxis: axes.xAxis,
      yAxis: axes.yAxis,
      series: [{
        type: 'line',
        data: rows.map((row) => [row.featureValue, row.predicted]),
        smooth: true,
        showSymbol: true,
        symbolSize: 6,
        itemStyle: { color },
        lineStyle: { color, width: 2 },
      }],
      grid: buildGrid({ bottom: 55 }),
    };
  }
}

chartRegistry.register({
  type: 'partial_dependence_plot',
  family: 'statistical',
  name: 'Partial Dependence Plot',
  description: 'Average predicted response over feature values',
  renderer: 'echarts',
  compatibleShapes: ['two_numeric', 'category_numeric', 'generic'],
  requiredColumns: [
    { role: 'feature_value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Feature value' },
    { role: 'predicted', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Predicted value' },
  ],
  createRenderer: () => new PartialDependencePlotRenderer(),
});
