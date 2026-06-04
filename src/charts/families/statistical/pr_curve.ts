import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { alignedScores } from '@/charts/echarts/alignedScores';
import { categoricalColor } from '@/lib/categoricalColor';
import { prCurve } from '@/data/stats/prCurve';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

class PrCurveRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return !alignedScores(data, config).some((v) => Number.isFinite(v));
  }

  protected emptyMessage(): string {
    return 'No scored rows to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const scores = alignedScores(data, config);
    const labels = data.columnArrays[config.columns['label']] ?? [];
    const result = prCurve(scores, labels);
    const points = result.points.map((p) => [p.recall, p.precision]);
    const color = categoricalColor(theme.colorScale, 0, theme.foreground);
    const apLabel = `AP ${result.ap.toFixed(3)}`;

    const axes = buildCartesianAxes(
      theme,
      { type: 'value', name: 'Recall', nameGap: 30 },
      { type: 'value', name: 'Precision', nameGap: 50, axisLine: false },
    );

    return {
      tooltip: buildTooltip('axis'),
      xAxis: axes.xAxis,
      yAxis: { ...(axes.yAxis as Record<string, unknown>), min: 0, max: 1 } as EChartsOption['yAxis'],
      series: [{
        name: apLabel,
        type: 'line',
        data: points,
        showSymbol: false,
        lineStyle: { color },
        itemStyle: { color },
      }],
      grid: buildGrid({ bottom: 50 }),
    };
  }
}

chartRegistry.register({
  type: 'pr_curve',
  family: 'statistical',
  name: 'Precision-Recall Curve',
  description: 'Precision against recall with average precision',
  renderer: 'echarts',
  compatibleShapes: ['two_numeric', 'category_numeric', 'generic'],
  requiredColumns: [
    { role: 'score', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Score' },
    { role: 'label', acceptedTypes: ['category', 'text', 'integer', 'boolean'], label: 'Label' },
  ],
  createRenderer: () => new PrCurveRenderer(),
});
