import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

interface StemRow {
  stem: string;
  count: number;
  leaves: string;
}

function finiteValues(data: DataView, config: ChartConfig): number[] {
  return (data.columnArrays[config.columns['value']] ?? []).filter((value): value is number => Number.isFinite(value));
}

function stemRows(values: number[]): StemRow[] {
  const stems = new Map<number, number[]>();
  for (const value of values) {
    const rounded = Math.round(value);
    const stem = Math.trunc(rounded / 10);
    const leaf = Math.abs(rounded % 10);
    const leaves = stems.get(stem) ?? [];
    leaves.push(leaf);
    stems.set(stem, leaves);
  }

  return Array.from(stems.entries())
    .sort(([a], [b]) => a - b)
    .map(([stem, leaves]) => ({
      stem: String(stem),
      count: leaves.length,
      leaves: leaves.sort((a, b) => a - b).join(' '),
    }));
}

class StemAndLeafRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return finiteValues(data, config).length === 0;
  }

  protected emptyMessage(): string {
    return 'No numeric values to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const rows = stemRows(finiteValues(data, config));
    const axes = buildCartesianAxes(
      theme,
      { type: 'value', name: 'Count', nameGap: 30 },
      { type: 'category', data: rows.map((row) => row.stem), name: 'Stem', axisLine: false },
    );

    return {
      tooltip: {
        ...buildTooltip('item'),
        formatter: (params: unknown) => {
          const param = Array.isArray(params) ? params[0] : params;
          const dataIndex = typeof param === 'object' && param !== null && 'dataIndex' in param
            ? Number((param as { dataIndex: unknown }).dataIndex)
            : -1;
          const row = rows[dataIndex];
          return row ? `Stem ${row.stem}<br/>Leaves: ${row.leaves}` : '';
        },
      },
      xAxis: axes.xAxis,
      yAxis: axes.yAxis,
      series: [{
        type: 'bar',
        data: rows.map((row) => row.count),
        itemStyle: { color: categoricalColor(theme.colorScale, 0, theme.foreground) },
      }],
      grid: buildGrid({ left: 70, bottom: 55 }),
    };
  }
}

chartRegistry.register({
  type: 'stem_and_leaf',
  family: 'distribution',
  name: 'Stem-and-Leaf Plot',
  description: 'Stem buckets with leaf digits summarized as counts and tooltip leaves',
  renderer: 'echarts',
  compatibleShapes: ['single_numeric', 'category_numeric', 'generic'],
  requiredColumns: [{ role: 'value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Value' }],
  createRenderer: () => new StemAndLeafRenderer(),
});
