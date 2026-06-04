import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

interface SlopeRow {
  label: string;
  start: number;
  end: number;
}

function slopeRows(data: DataView, config: ChartConfig): SlopeRow[] {
  const labels = data.columnArrays[config.columns['label']] ?? [];
  const starts = data.columnArrays[config.columns['start_value']] ?? [];
  const ends = data.columnArrays[config.columns['end_value']] ?? [];
  const n = Math.min(labels.length, starts.length, ends.length);
  const rows: SlopeRow[] = [];

  for (let i = 0; i < n; i++) {
    const start = starts[i];
    const end = ends[i];
    if (typeof start === 'number' && Number.isFinite(start) && typeof end === 'number' && Number.isFinite(end)) {
      rows.push({ label: String(labels[i]), start, end });
    }
  }

  return rows;
}

class SlopeRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return slopeRows(data, config).length === 0;
  }

  protected emptyMessage(): string {
    return 'No paired values to display';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const rows = slopeRows(data, config);
    const axes = buildCartesianAxes(
      theme,
      { type: 'category', data: ['Start', 'End'] },
      { type: 'value', axisLine: false },
    );

    return {
      tooltip: buildTooltip('item'),
      xAxis: axes.xAxis,
      yAxis: axes.yAxis,
      series: rows.map((row, i) => ({
        name: row.label,
        type: 'line',
        data: [row.start, row.end],
        symbolSize: 8,
        itemStyle: { color: categoricalColor(theme.colorScale, i, theme.foreground) },
        lineStyle: { color: categoricalColor(theme.colorScale, i, theme.foreground), width: 2 },
      })),
      grid: buildGrid(),
    };
  }
}

chartRegistry.register({
  type: 'slope',
  family: 'categorical',
  name: 'Slope Chart',
  description: 'Paired start/end values connected for each label',
  renderer: 'echarts',
  compatibleShapes: ['category_numeric', 'generic'],
  requiredColumns: [
    { role: 'label', acceptedTypes: ['category', 'text'], label: 'Label' },
    { role: 'start_value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Start value' },
    { role: 'end_value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'End value' },
  ],
  createRenderer: () => new SlopeRenderer(),
});
