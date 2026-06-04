import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

interface BulletRow {
  label: string;
  actual: number;
  target: number;
  range1: number;
  range2: number;
  range3: number;
}

function finiteBulletRows(data: DataView, config: ChartConfig): BulletRow[] {
  const labels = data.columnArrays[config.columns['label']] ?? [];
  const actuals = data.columnArrays[config.columns['actual']] ?? [];
  const targets = data.columnArrays[config.columns['target']] ?? [];
  const range1 = data.columnArrays[config.columns['range1']] ?? [];
  const range2 = data.columnArrays[config.columns['range2']] ?? [];
  const range3 = data.columnArrays[config.columns['range3']] ?? [];
  const out: BulletRow[] = [];

  for (let i = 0; i < actuals.length; i++) {
    const row = [actuals[i], targets[i], range1[i], range2[i], range3[i]];
    if (row.every((v): v is number => typeof v === 'number' && Number.isFinite(v))) {
      out.push({
        label: String(labels[i]),
        actual: row[0],
        target: row[1],
        range1: row[2],
        range2: row[3],
        range3: row[4],
      });
    }
  }

  return out;
}

class BulletChartRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return finiteBulletRows(data, config).length === 0;
  }

  protected emptyMessage(): string {
    return 'No bullet values to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const rows = finiteBulletRows(data, config);
    const labels = rows.map((r) => r.label);
    const axes = buildCartesianAxes(theme, { type: 'value', axisLine: false }, { type: 'category', data: labels });
    const actual = categoricalColor(theme.colorScale, 0, theme.foreground);
    const target = categoricalColor(theme.colorScale, 1, theme.foreground);

    return {
      tooltip: buildTooltip('axis', { axisPointer: { type: 'shadow' } }),
      xAxis: axes.xAxis,
      yAxis: axes.yAxis,
      grid: buildGrid({ left: 96 }),
      series: [
        { type: 'bar', name: 'Range 3', data: rows.map((r) => r.range3), barGap: '-100%', itemStyle: { color: theme.gridColor }, silent: true },
        { type: 'bar', name: 'Range 2', data: rows.map((r) => r.range2), barGap: '-100%', itemStyle: { color: theme.axisColor }, silent: true },
        { type: 'bar', name: 'Range 1', data: rows.map((r) => r.range1), barGap: '-100%', itemStyle: { color: theme.background }, silent: true },
        { type: 'bar', name: 'Actual', data: rows.map((r) => r.actual), barWidth: 12, itemStyle: { color: actual } },
        { type: 'scatter', name: 'Target', data: rows.map((r) => r.target), symbol: 'rect', symbolSize: [4, 28], itemStyle: { color: target } },
      ],
    };
  }
}

chartRegistry.register({
  type: 'bullet_chart',
  family: 'specialized',
  name: 'Bullet Chart',
  description: 'KPI actual values compared with target and qualitative ranges',
  renderer: 'echarts',
  compatibleShapes: ['category_numeric', 'generic'],
  requiredColumns: [
    { role: 'label', acceptedTypes: ['category', 'text'], label: 'Label' },
    { role: 'actual', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Actual' },
    { role: 'target', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Target' },
    { role: 'range1', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Range 1' },
    { role: 'range2', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Range 2' },
    { role: 'range3', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Range 3' },
  ],
  createRenderer: () => new BulletChartRenderer(),
});
