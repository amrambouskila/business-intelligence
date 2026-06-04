import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

interface Slice {
  name: string;
  value: number;
}

function aggregateNested(data: DataView, config: ChartConfig): { outer: Slice[]; inner: Slice[] } {
  const level1 = data.columnArrays[config.columns['level1']] ?? [];
  const level2 = data.columnArrays[config.columns['level2']] ?? [];
  const values = data.columnArrays[config.columns['value']] ?? [];
  const outer = new Map<string, number>();
  const inner = new Map<string, number>();

  for (let i = 0; i < level1.length; i++) {
    const value = values[i];
    if (typeof value !== 'number' || !Number.isFinite(value)) continue;
    const parent = String(level1[i]);
    const child = String(level2[i]);
    outer.set(parent, (outer.get(parent) ?? 0) + value);
    inner.set(`${parent} / ${child}`, (inner.get(`${parent} / ${child}`) ?? 0) + value);
  }

  return {
    outer: Array.from(outer, ([name, value]) => ({ name, value })),
    inner: Array.from(inner, ([name, value]) => ({ name, value })),
  };
}

class NestedDonutRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return aggregateNested(data, config).inner.length === 0;
  }

  protected emptyMessage(): string {
    return 'No values to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const { outer, inner } = aggregateNested(data, config);
    return {
      tooltip: buildTooltip('item'),
      series: [
        {
          name: 'Level 1',
          type: 'pie',
          radius: ['0%', '38%'],
          label: { color: theme.foreground },
          data: outer.map((slice, i) => ({
            ...slice,
            itemStyle: { color: categoricalColor(theme.colorScale, i, theme.foreground) },
          })),
        },
        {
          name: 'Level 2',
          type: 'pie',
          radius: ['48%', '72%'],
          label: { color: theme.foreground },
          data: inner.map((slice, i) => ({
            ...slice,
            itemStyle: { color: categoricalColor(theme.colorScale, i, theme.foreground) },
          })),
        },
      ],
    };
  }
}

chartRegistry.register({
  type: 'nested_donut',
  family: 'composition',
  name: 'Nested Donut',
  description: 'Two-level proportional composition as concentric donut rings',
  renderer: 'echarts',
  compatibleShapes: ['category_numeric', 'generic'],
  requiredColumns: [
    { role: 'level1', acceptedTypes: ['category', 'text'], label: 'Level 1' },
    { role: 'level2', acceptedTypes: ['category', 'text'], label: 'Level 2' },
    { role: 'value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Value' },
  ],
  createRenderer: () => new NestedDonutRenderer(),
});
