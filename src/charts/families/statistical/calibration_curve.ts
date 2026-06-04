import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { resolveOptions } from '@/charts/resolve-options';
import { alignedScores } from '@/charts/echarts/alignedScores';
import { categoricalColor } from '@/lib/categoricalColor';
import { calibrationCurve } from '@/data/stats/calibrationCurve';
import type { ChartOptionSpec } from '@/charts/option-spec';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

const optionSpecs: ChartOptionSpec[] = [
  { key: 'bins', label: 'Bins', control: 'number', default: 10, min: 2, max: 50, step: 1 },
];

function binCount(config: ChartConfig): number {
  return resolveOptions(optionSpecs, config.options).bins as number;
}

class CalibrationCurveRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    const scores = alignedScores(data, config);
    const labels = data.columnArrays[config.columns['label']] ?? [];
    return calibrationCurve(scores, labels, binCount(config)).length === 0;
  }

  protected emptyMessage(): string {
    return 'No scored rows to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const scores = alignedScores(data, config);
    const labels = data.columnArrays[config.columns['label']] ?? [];
    const curve = calibrationCurve(scores, labels, binCount(config));
    const points = curve.map((bin) => [bin.meanPredicted, bin.observedRate]);
    const color = categoricalColor(theme.colorScale, 0, theme.foreground);

    const axes = buildCartesianAxes(
      theme,
      { type: 'value', name: 'Predicted', nameGap: 30 },
      { type: 'value', name: 'Observed', nameGap: 40, axisLine: false },
    );

    return {
      tooltip: buildTooltip('axis'),
      xAxis: { ...(axes.xAxis as Record<string, unknown>), min: 0, max: 1 } as EChartsOption['xAxis'],
      yAxis: { ...(axes.yAxis as Record<string, unknown>), min: 0, max: 1 } as EChartsOption['yAxis'],
      series: [
        {
          name: 'Calibration',
          type: 'line',
          data: points,
          showSymbol: true,
          symbolSize: 8,
          lineStyle: { color },
          itemStyle: { color },
        },
        {
          name: 'Perfect',
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
  type: 'calibration_curve',
  family: 'statistical',
  name: 'Calibration Curve',
  description: 'Observed frequency against predicted probability, binned',
  renderer: 'echarts',
  compatibleShapes: ['two_numeric', 'category_numeric', 'generic'],
  requiredColumns: [
    { role: 'score', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Score' },
    { role: 'label', acceptedTypes: ['category', 'text', 'integer', 'boolean'], label: 'Label' },
  ],
  options: optionSpecs,
  createRenderer: () => new CalibrationCurveRenderer(),
});
