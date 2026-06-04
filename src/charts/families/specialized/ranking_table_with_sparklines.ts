import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

interface RankPoint {
  date: string;
  entity: string;
  rank: number;
}

interface RankRow {
  entity: string;
  latestRank: number;
  points: RankPoint[];
}

function rankingPoints(data: DataView, config: ChartConfig): RankPoint[] {
  const dates = data.columnArrays[config.columns['date']] ?? [];
  const entities = data.columnArrays[config.columns['entity']] ?? [];
  const ranks = data.columnArrays[config.columns['rank']] ?? [];
  const n = Math.min(dates.length, entities.length, ranks.length);
  const out: RankPoint[] = [];

  for (let i = 0; i < n; i++) {
    const rank = ranks[i];
    if (dates[i] == null || entities[i] == null || typeof rank !== 'number' || !Number.isFinite(rank)) continue;
    out.push({ date: String(dates[i]), entity: String(entities[i]), rank });
  }

  return out;
}

function rankingRows(points: RankPoint[]): RankRow[] {
  const byEntity = new Map<string, RankPoint[]>();
  for (const point of points) {
    byEntity.set(point.entity, [...(byEntity.get(point.entity) ?? []), point]);
  }

  return [...byEntity.entries()]
    .map(([entity, entityPoints]) => {
      const sorted = entityPoints.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      return { entity, latestRank: sorted[sorted.length - 1].rank, points: sorted };
    })
    .sort((a, b) => a.latestRank - b.latestRank || a.entity.localeCompare(b.entity))
    .slice(0, 10);
}

function sparklinePoints(points: RankPoint[], x: number, y: number, width: number, height: number, minRank: number, maxRank: number): [number, number][] {
  const range = maxRank - minRank;
  return points.map((point, index) => {
    const px = points.length === 1 ? x + width / 2 : x + (index / (points.length - 1)) * width;
    const normalized = range <= 0 ? 0.5 : (point.rank - minRank) / range;
    return [px, y + normalized * height];
  });
}

class RankingTableWithSparklinesRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return rankingPoints(data, config).length === 0;
  }

  protected emptyMessage(): string {
    return 'No ranking rows to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const rows = rankingRows(rankingPoints(data, config));
    const ranks = rows.flatMap((row) => row.points.map((point) => point.rank));
    const minRank = ranks.reduce((a, b) => (a < b ? a : b), Infinity);
    const maxRank = ranks.reduce((a, b) => (a > b ? a : b), -Infinity);
    const rowHeight = 34;
    const sparkX = 214;
    const sparkWidth = 152;

    return {
      graphic: [{
        type: 'group',
        left: 32,
        top: 28,
        children: [
          {
            type: 'text',
            style: { text: 'Rank', fill: theme.axisColor, font: `600 ${theme.fontSize.medium}px ${theme.fontFamily}` },
          },
          {
            type: 'text',
            x: 54,
            style: { text: 'Entity', fill: theme.axisColor, font: `600 ${theme.fontSize.medium}px ${theme.fontFamily}` },
          },
          {
            type: 'text',
            x: sparkX,
            style: { text: 'Sparkline', fill: theme.axisColor, font: `600 ${theme.fontSize.medium}px ${theme.fontFamily}` },
          },
          ...rows.flatMap((row, index) => {
            const y = 28 + index * rowHeight;
            const color = categoricalColor(theme.colorScale, index, theme.foreground);
            return [
              {
                type: 'line',
                shape: { x1: 0, y1: y + 23, x2: 390, y2: y + 23 },
                style: { stroke: theme.gridColor, lineWidth: 1 },
              },
              {
                type: 'text',
                y,
                style: { text: String(row.latestRank), fill: theme.foreground, font: `${theme.fontSize.medium}px ${theme.fontFamily}` },
              },
              {
                type: 'text',
                x: 54,
                y,
                style: { text: row.entity, fill: theme.foreground, font: `${theme.fontSize.medium}px ${theme.fontFamily}` },
              },
              {
                type: 'polyline',
                shape: { points: sparklinePoints(row.points, sparkX, y + 2, sparkWidth, 18, minRank, maxRank) },
                style: { stroke: color, lineWidth: 2 },
              },
            ];
          }),
        ],
      }],
    };
  }
}

chartRegistry.register({
  type: 'ranking_table_with_sparklines',
  family: 'specialized',
  name: 'Ranking Table with Sparklines',
  description: 'Latest entity rankings shown with compact rank-history sparklines',
  renderer: 'echarts',
  compatibleShapes: ['time_series_numeric', 'generic'],
  requiredColumns: [
    { role: 'date', acceptedTypes: ['datetime', 'date'], label: 'Date' },
    { role: 'entity', acceptedTypes: ['category', 'text'], label: 'Entity' },
    { role: 'rank', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Rank' },
  ],
  createRenderer: () => new RankingTableWithSparklinesRenderer(),
});
