import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

interface RankPoint {
  date: string;
  entity: string;
  rank: number;
}

function rankPoints(data: DataView, config: ChartConfig): RankPoint[] {
  const dates = data.columnArrays[config.columns['date']] ?? [];
  const entities = data.columnArrays[config.columns['entity']] ?? [];
  const ranks = data.columnArrays[config.columns['rank']] ?? [];
  const n = Math.min(dates.length, entities.length, ranks.length);
  const points: RankPoint[] = [];

  for (let i = 0; i < n; i++) {
    const rank = ranks[i];
    if (dates[i] == null || entities[i] == null || typeof rank !== 'number' || !Number.isFinite(rank)) continue;
    points.push({ date: String(dates[i]), entity: String(entities[i]), rank });
  }

  return points;
}

class BumpChartRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return rankPoints(data, config).length === 0;
  }

  protected emptyMessage(): string {
    return 'No rankings to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const points = rankPoints(data, config);
    const entities = [...new Set(points.map((p) => p.entity))];
    const maxRank = points.map((p) => p.rank).reduce((a, b) => (a > b ? a : b), 1);
    const axes = buildCartesianAxes(
      theme,
      { type: 'time', name: config.columns['date'] },
      { type: 'value', name: 'Rank', inverse: true, axisLine: false },
    );

    return {
      tooltip: buildTooltip('axis'),
      legend: { bottom: 0, textStyle: { color: theme.foreground } },
      xAxis: axes.xAxis,
      yAxis: { ...(axes.yAxis as Record<string, unknown>), min: 1, max: maxRank, interval: 1 },
      grid: buildGrid({ bottom: 72 }),
      series: entities.map((entity, i) => ({
        name: entity,
        type: 'line',
        data: points
          .filter((p) => p.entity === entity)
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          .map((p) => [p.date, p.rank]),
        symbolSize: 9,
        lineStyle: { width: 3, color: categoricalColor(theme.colorScale, i, theme.foreground) },
        itemStyle: { color: categoricalColor(theme.colorScale, i, theme.foreground) },
      })),
    };
  }
}

chartRegistry.register({
  type: 'bump_chart',
  family: 'specialized',
  name: 'Bump Chart',
  description: 'Ranked entities tracked over time with rank one at the top',
  renderer: 'echarts',
  compatibleShapes: ['time_series_numeric', 'generic'],
  requiredColumns: [
    { role: 'date', acceptedTypes: ['datetime', 'date'], label: 'Date' },
    { role: 'entity', acceptedTypes: ['category', 'text'], label: 'Entity' },
    { role: 'rank', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Rank' },
  ],
  createRenderer: () => new BumpChartRenderer(),
});
