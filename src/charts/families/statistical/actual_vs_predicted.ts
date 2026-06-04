import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

/** Pairs whose actual and predicted are both finite — the only points worth plotting. */
function finitePairs(data: DataView, config: ChartConfig): [number, number][] {
  const actual = (data.columnArrays[config.columns['actual']] ?? []) as unknown[];
  const predicted = (data.columnArrays[config.columns['predicted']] ?? []) as unknown[];
  const pairs: [number, number][] = [];
  for (let i = 0; i < actual.length; i++) {
    const a = actual[i];
    const p = predicted[i];
    if (Number.isFinite(a) && Number.isFinite(p)) pairs.push([a as number, p as number]);
  }
  return pairs;
}

class ActualVsPredictedRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return finitePairs(data, config).length === 0;
  }

  protected emptyMessage(): string {
    return 'No predictions to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const pairs = finitePairs(data, config);
    const flat = pairs.flat();
    const m = Math.min(...flat);
    const M = Math.max(...flat);
    const color = categoricalColor(theme.colorScale, 0, theme.foreground);

    const axes = buildCartesianAxes(
      theme,
      { type: 'value', name: config.columns['actual'], nameGap: 30 },
      { type: 'value', name: config.columns['predicted'], nameGap: 40, axisLine: false },
    );

    return {
      tooltip: buildTooltip('item'),
      xAxis: axes.xAxis,
      yAxis: axes.yAxis,
      series: [
        {
          type: 'scatter',
          data: pairs,
          itemStyle: { color },
        },
        {
          type: 'line',
          data: [[m, m], [M, M]],
          showSymbol: false,
          lineStyle: { color: theme.gridColor },
        },
      ],
      grid: buildGrid({ bottom: 50 }),
    };
  }
}

chartRegistry.register({
  type: 'actual_vs_predicted',
  family: 'statistical',
  name: 'Actual vs Predicted',
  description: 'Predicted against actual values with a y=x reference line',
  renderer: 'echarts',
  compatibleShapes: ['two_numeric', 'generic'],
  requiredColumns: [
    { role: 'actual', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Actual' },
    { role: 'predicted', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Predicted' },
  ],
  createRenderer: () => new ActualVsPredictedRenderer(),
});
