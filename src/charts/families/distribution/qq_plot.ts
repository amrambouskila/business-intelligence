import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { categoricalColor } from '@/lib/categoricalColor';
import { qqPoints } from '@/data/stats/qqPoints';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

class QQPlotRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return qqPoints(this.values(data, config)).length === 0;
  }

  protected emptyMessage(): string {
    return 'No numeric values to chart';
  }

  private values(data: DataView, config: ChartConfig): number[] {
    return (data.columnArrays[config.columns['value']] ?? []) as number[];
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const pts = qqPoints(this.values(data, config));
    const scatter = pts.map((p) => [p.theoretical, p.sample]);

    // Reference line sample = mean + sd*theoretical, in the value column's units.
    const samples = pts.map((p) => p.sample);
    const n = samples.length;
    const mean = samples.reduce((acc, v) => acc + v, 0) / n;
    const variance = samples.reduce((acc, v) => acc + (v - mean) ** 2, 0) / n;
    const sd = Math.sqrt(variance);

    const theoreticals = pts.map((p) => p.theoretical);
    const tMin = Math.min(...theoreticals);
    const tMax = Math.max(...theoreticals);
    const line = [
      [tMin, mean + sd * tMin],
      [tMax, mean + sd * tMax],
    ];

    const pointColor = categoricalColor(theme.colorScale, 0, theme.foreground);
    const lineColor = categoricalColor(theme.colorScale, 1, theme.foreground);

    const axes = buildCartesianAxes(
      theme,
      { type: 'value', name: 'Theoretical', nameGap: 30 },
      { type: 'value', name: 'Sample', nameGap: 50, axisLine: false },
    );

    return {
      tooltip: buildTooltip('item'),
      xAxis: axes.xAxis,
      yAxis: axes.yAxis,
      series: [
        {
          type: 'scatter',
          data: scatter,
          symbolSize: 6,
          itemStyle: { color: pointColor },
        },
        {
          type: 'line',
          data: line,
          showSymbol: false,
          lineStyle: { color: lineColor },
          itemStyle: { color: lineColor },
        },
      ],
      grid: buildGrid({ bottom: 50 }),
    };
  }
}

chartRegistry.register({
  type: 'qq_plot',
  family: 'distribution',
  name: 'Q-Q Plot',
  description: 'Sample quantiles against theoretical normal quantiles',
  renderer: 'echarts',
  compatibleShapes: ['single_numeric', 'category_numeric', 'generic'],
  requiredColumns: [{ role: 'value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Value' }],
  createRenderer: () => new QQPlotRenderer(),
});
