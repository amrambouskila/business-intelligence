import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

interface RetentionPoint {
  period: string;
  periodSort: number;
  retention: number;
}

function averageRetentionByPeriod(data: DataView, config: ChartConfig): RetentionPoint[] {
  const periods = data.columnArrays[config.columns['period']] ?? [];
  const retentions = data.columnArrays[config.columns['retention']] ?? [];
  const totals = new Map<string, { sum: number; count: number; sort: number }>();
  const n = Math.min(periods.length, retentions.length);

  for (let i = 0; i < n; i++) {
    const retention = retentions[i];
    if (periods[i] == null || typeof retention !== 'number' || !Number.isFinite(retention)) continue;
    const period = String(periods[i]);
    const numericPeriod = typeof periods[i] === 'number' ? periods[i] : Number.parseFloat(period);
    const sort = Number.isFinite(numericPeriod) ? Number(numericPeriod) : i;
    const current = totals.get(period) ?? { sum: 0, count: 0, sort };
    current.sort = sort;
    current.sum += retention;
    current.count += 1;
    totals.set(period, current);
  }

  return [...totals.entries()]
    .map(([period, v]) => ({ period, periodSort: v.sort, retention: +(v.sum / v.count).toFixed(2) }))
    .sort((a, b) => a.periodSort - b.periodSort);
}

class RetentionCurveRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return averageRetentionByPeriod(data, config).length === 0;
  }

  protected emptyMessage(): string {
    return 'No retention values to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const points = averageRetentionByPeriod(data, config);
    const axes = buildCartesianAxes(
      theme,
      { type: 'category', data: points.map((p) => p.period), name: 'Period' },
      { type: 'value', name: 'Retention', nameGap: 48, axisLine: false },
    );

    return {
      tooltip: buildTooltip('axis'),
      xAxis: axes.xAxis,
      yAxis: { ...(axes.yAxis as Record<string, unknown>), min: 0, max: 100 },
      grid: buildGrid({ left: 76, bottom: 60 }),
      series: [{
        type: 'line',
        smooth: true,
        symbolSize: 8,
        data: points.map((p) => p.retention),
        itemStyle: { color: categoricalColor(theme.colorScale, 0, theme.foreground) },
        lineStyle: { color: categoricalColor(theme.colorScale, 0, theme.foreground), width: 3 },
        areaStyle: { color: categoricalColor(theme.colorScale, 0, theme.foreground), opacity: 0.14 },
      }],
    };
  }
}

chartRegistry.register({
  type: 'retention_curve',
  family: 'specialized',
  name: 'Retention Curve',
  description: 'Average retention percentage across elapsed periods',
  renderer: 'echarts',
  compatibleShapes: ['category_numeric', 'time_numeric', 'generic'],
  requiredColumns: [
    { role: 'period', acceptedTypes: ['category', 'text', 'integer', 'numeric'], label: 'Period' },
    { role: 'retention', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Retention' },
  ],
  createRenderer: () => new RetentionCurveRenderer(),
});
