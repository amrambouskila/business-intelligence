import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

interface RetentionCell {
  cohort: string;
  period: string;
  periodSort: number;
  retention: number;
}

function retentionCells(data: DataView, config: ChartConfig): RetentionCell[] {
  const cohorts = data.columnArrays[config.columns['cohort']] ?? [];
  const periods = data.columnArrays[config.columns['period']] ?? [];
  const retentions = data.columnArrays[config.columns['retention']] ?? [];
  const n = Math.min(cohorts.length, periods.length, retentions.length);
  const cells: RetentionCell[] = [];

  for (let i = 0; i < n; i++) {
    const retention = retentions[i];
    if (cohorts[i] == null || periods[i] == null || typeof retention !== 'number' || !Number.isFinite(retention)) continue;
    const rawPeriod = periods[i];
    const numericPeriod = typeof rawPeriod === 'number' && Number.isFinite(rawPeriod) ? rawPeriod : Number.parseFloat(String(rawPeriod));
    cells.push({
      cohort: String(cohorts[i]),
      period: String(rawPeriod),
      periodSort: Number.isFinite(numericPeriod) ? numericPeriod : i,
      retention,
    });
  }

  return cells;
}

class CohortRetentionHeatmapRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return retentionCells(data, config).length === 0;
  }

  protected emptyMessage(): string {
    return 'No cohort retention values to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const cells = retentionCells(data, config);
    const cohorts = [...new Set(cells.map((c) => c.cohort))];
    const periods = [...new Map(cells
      .sort((a, b) => a.periodSort - b.periodSort)
      .map((c) => [c.period, c.period])).values()];
    const cohortIndex = new Map(cohorts.map((cohort, i) => [cohort, i]));
    const periodIndex = new Map(periods.map((period, i) => [period, i]));
    const values = cells.map((c) => c.retention);
    const min = values.reduce((a, b) => (a < b ? a : b), Infinity);
    const max = values.reduce((a, b) => (a > b ? a : b), -Infinity);
    const seriesData = cells.map((c) => [periodIndex.get(c.period)!, cohortIndex.get(c.cohort)!, c.retention]);

    const axes = buildCartesianAxes(
      theme,
      { type: 'category', data: periods, name: 'Period' },
      { type: 'category', data: cohorts, axisLine: false },
    );

    return {
      tooltip: buildTooltip('item'),
      xAxis: axes.xAxis,
      yAxis: axes.yAxis,
      grid: buildGrid({ left: 96, bottom: 76 }),
      visualMap: {
        min,
        max,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: 0,
        inRange: { color: [...theme.sequentialScale] },
        textStyle: { color: theme.axisColor },
      },
      series: [{
        type: 'heatmap',
        data: seriesData,
        label: {
          show: true,
          color: theme.foreground,
          formatter: (params: unknown) => {
            const value = (params as { value?: unknown }).value;
            return Array.isArray(value) ? `${value[2] ?? ''}%` : '';
          },
        },
      }],
    };
  }
}

chartRegistry.register({
  type: 'cohort_retention_heatmap',
  family: 'specialized',
  name: 'Cohort Retention Heatmap',
  description: 'Retention percentages by cohort and elapsed period',
  renderer: 'echarts',
  compatibleShapes: ['category_numeric', 'time_numeric', 'matrix', 'generic'],
  requiredColumns: [
    { role: 'cohort', acceptedTypes: ['category', 'text', 'datetime', 'date'], label: 'Cohort' },
    { role: 'period', acceptedTypes: ['category', 'text', 'integer', 'numeric'], label: 'Period' },
    { role: 'retention', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Retention' },
  ],
  createRenderer: () => new CohortRetentionHeatmapRenderer(),
});
