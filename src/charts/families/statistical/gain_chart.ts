import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

function finitePairs(data: DataView, config: ChartConfig): [number, number][] {
  const xs = data.columnArrays[config.columns['x']] ?? [];
  const gains = data.columnArrays[config.columns['gain']] ?? [];
  const n = Math.min(xs.length, gains.length);
  const pairs: [number, number][] = [];

  for (let i = 0; i < n; i++) {
    const x = xs[i];
    const gain = gains[i];
    if (typeof x === 'number' && Number.isFinite(x) && typeof gain === 'number' && Number.isFinite(gain)) {
      pairs.push([x, gain]);
    }
  }

  return pairs.sort((a, b) => a[0] - b[0]);
}

class GainChartRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return finitePairs(data, config).length === 0;
  }

  protected emptyMessage(): string {
    return 'No gain values to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const pairs = finitePairs(data, config);
    const color = categoricalColor(theme.colorScale, 0, theme.foreground);
    const axes = buildCartesianAxes(
      theme,
      { type: 'value', name: config.columns['x'], nameGap: 30 },
      { type: 'value', name: config.columns['gain'], nameGap: 40, axisLine: false },
    );

    return {
      tooltip: buildTooltip('axis'),
      xAxis: axes.xAxis,
      yAxis: axes.yAxis,
      series: [
        {
          name: 'Gain',
          type: 'line',
          data: pairs,
          smooth: true,
          itemStyle: { color },
          lineStyle: { color, width: 2 },
        },
        {
          name: 'Baseline',
          type: 'line',
          data: [[0, 0], [1, 1]],
          showSymbol: false,
          lineStyle: { color: theme.gridColor, type: 'dashed' },
        },
      ],
      grid: buildGrid({ bottom: 50 }),
    };
  }
}

chartRegistry.register({
  type: 'gain_chart',
  family: 'statistical',
  name: 'Gain Chart',
  description: 'Cumulative gain across sorted population or decile bins',
  renderer: 'echarts',
  compatibleShapes: ['two_numeric', 'generic'],
  requiredColumns: [
    { role: 'x', acceptedTypes: ['numeric', 'integer', 'float'], label: 'X' },
    { role: 'gain', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Gain' },
  ],
  createRenderer: () => new GainChartRenderer(),
});
