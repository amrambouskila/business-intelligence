import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { alignedScores } from '@/charts/echarts/alignedScores';
import { categoricalColor } from '@/lib/categoricalColor';
import { rocCurve } from '@/data/stats/rocCurve';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

class RocCurveRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return !alignedScores(data, config).some((v) => Number.isFinite(v));
  }

  protected emptyMessage(): string {
    return 'No scored rows to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const scores = alignedScores(data, config);
    const labels = data.columnArrays[config.columns['label']] ?? [];
    const result = rocCurve(scores, labels);
    const points = result.points.map((p) => [p.fpr, p.tpr]);
    const color = categoricalColor(theme.colorScale, 0, theme.foreground);

    const axes = buildCartesianAxes(
      theme,
      { type: 'value', name: 'FPR', nameGap: 30 },
      { type: 'value', name: 'TPR', nameGap: 40, axisLine: false },
    );

    return {
      tooltip: buildTooltip('axis'),
      xAxis: axes.xAxis,
      yAxis: axes.yAxis,
      series: [
        {
          name: `ROC (AUC ${result.auc.toFixed(3)})`,
          type: 'line',
          data: points,
          showSymbol: false,
          lineStyle: { color },
          itemStyle: { color },
        },
        {
          name: 'Chance',
          type: 'line',
          data: [[0, 0], [1, 1]],
          showSymbol: false,
          lineStyle: { color: theme.gridColor, type: 'dashed' },
          itemStyle: { color: theme.gridColor },
        },
      ],
      grid: buildGrid({ bottom: 50 }),
    };
  }
}

chartRegistry.register({
  type: 'roc_curve',
  family: 'statistical',
  name: 'ROC Curve',
  description: 'Receiver operating characteristic curve with AUC',
  renderer: 'echarts',
  compatibleShapes: ['two_numeric', 'category_numeric', 'generic'],
  requiredColumns: [
    { role: 'score', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Score' },
    { role: 'label', acceptedTypes: ['category', 'text', 'integer', 'boolean'], label: 'Label' },
  ],
  createRenderer: () => new RocCurveRenderer(),
});
