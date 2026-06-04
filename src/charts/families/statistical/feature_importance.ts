import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

interface FeatureImportance {
  feature: string;
  importance: number;
}

function sortedImportances(data: DataView, config: ChartConfig): FeatureImportance[] {
  const features = data.columnArrays[config.columns['feature']] ?? [];
  const importances = data.columnArrays[config.columns['importance']] ?? [];
  const out: FeatureImportance[] = [];
  for (let i = 0; i < features.length; i++) {
    const v = importances[i];
    if (typeof v === 'number' && Number.isFinite(v)) out.push({ feature: String(features[i]), importance: v });
  }
  return out.sort((a, b) => b.importance - a.importance);
}

class FeatureImportanceRenderer extends EChartsBaseRenderer {
  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const pairs = sortedImportances(data, config);
    // ECharts draws a category y-axis bottom-up, so reverse the descending list to
    // put the largest importance at the top of the chart.
    const features = pairs.map((p) => p.feature).reverse();
    const values = pairs.map((p) => p.importance).reverse();

    const axes = buildCartesianAxes(
      theme,
      { type: 'value', axisLine: false },
      { type: 'category', data: features },
    );

    return {
      tooltip: buildTooltip('axis', { axisPointer: { type: 'shadow' } }),
      xAxis: axes.xAxis,
      yAxis: axes.yAxis,
      series: [{
        type: 'bar',
        data: values,
        itemStyle: { color: categoricalColor(theme.colorScale, 0, theme.foreground) },
        barWidth: '60%',
      }],
      grid: buildGrid({ left: 120 }),
    };
  }

  protected override isEmpty(data: DataView, config: ChartConfig): boolean {
    return sortedImportances(data, config).length === 0;
  }

  protected override emptyMessage(): string {
    return 'No importances to chart';
  }
}

chartRegistry.register({
  type: 'feature_importance',
  family: 'statistical',
  name: 'Feature Importance',
  description: 'Model feature importances as a sorted horizontal bar chart',
  renderer: 'echarts',
  compatibleShapes: ['category_numeric', 'generic'],
  requiredColumns: [
    { role: 'feature', acceptedTypes: ['category', 'text'], label: 'Feature' },
    { role: 'importance', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Importance' },
  ],
  createRenderer: () => new FeatureImportanceRenderer(),
});
