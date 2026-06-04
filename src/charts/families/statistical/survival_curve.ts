import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { categoricalColor } from '@/lib/categoricalColor';
import { isPositiveLabel } from '@/data/stats/isPositiveLabel';
import { survivalCurve } from '@/data/stats/survival';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

function observations(data: DataView, config: ChartConfig): Array<{ time: number; event: boolean }> {
  const times = data.columnArrays[config.columns['time']] ?? [];
  const events = data.columnArrays[config.columns['event']] ?? [];
  const rows: Array<{ time: number; event: boolean }> = [];
  const n = Math.min(times.length, events.length);

  for (let i = 0; i < n; i++) {
    const time = times[i];
    if (typeof time === 'number' && Number.isFinite(time) && time >= 0) {
      rows.push({ time, event: isPositiveLabel(events[i]) });
    }
  }

  return rows;
}

class SurvivalCurveRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return observations(data, config).length === 0;
  }

  protected emptyMessage(): string {
    return 'No survival observations to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const color = categoricalColor(theme.colorScale, 0, theme.foreground);
    const points = survivalCurve(observations(data, config)).map((point) => [point.time, point.survival * 100]);
    const axes = buildCartesianAxes(
      theme,
      { type: 'value', name: config.columns['time'], nameGap: 30 },
      { type: 'value', name: 'Survival', nameGap: 42, axisLine: false },
    );
    axes.yAxis = { ...(axes.yAxis as object), min: 0, max: 100, axisLabel: { color: theme.axisColor, fontSize: theme.fontSize.small, formatter: '{value}%' } };

    return {
      tooltip: buildTooltip('axis'),
      xAxis: axes.xAxis,
      yAxis: axes.yAxis,
      series: [{
        name: 'Survival',
        type: 'line',
        step: 'end',
        data: [[0, 100], ...points],
        lineStyle: { color, width: 2 },
        itemStyle: { color },
      }],
      grid: buildGrid({ bottom: 50 }),
    };
  }
}

chartRegistry.register({
  type: 'survival_curve',
  family: 'statistical',
  name: 'Survival Curve',
  description: 'Kaplan-Meier survival probability over time',
  renderer: 'echarts',
  compatibleShapes: ['survival', 'two_numeric', 'category_numeric', 'generic'],
  requiredColumns: [
    { role: 'time', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Time' },
    { role: 'event', acceptedTypes: ['boolean', 'numeric', 'integer', 'float', 'category'], label: 'Event' },
  ],
  createRenderer: () => new SurvivalCurveRenderer(),
});
