import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { aggregatedCategoryValues } from '@/charts/echarts/aggregatedCategoryValues';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

const WAFFLE_SIZE = 10;
const WAFFLE_CELLS = WAFFLE_SIZE * WAFFLE_SIZE;

interface WaffleSlice {
  name: string;
  value: number;
  cells: number[][];
}

function waffleSlices(data: DataView, config: ChartConfig): WaffleSlice[] {
  const positive = aggregatedCategoryValues(data, config).filter((slice) => slice.value > 0);
  const total = positive.reduce((sum, slice) => sum + slice.value, 0);
  if (total <= 0) return [];

  let cursor = 0;
  return positive.map((slice, index) => {
    const count = index === positive.length - 1
      ? WAFFLE_CELLS - cursor
      : Math.round((slice.value / total) * WAFFLE_CELLS);
    const cells = Array.from({ length: Math.max(0, count) }, (_, offset) => {
      const cell = cursor + offset;
      return [cell % WAFFLE_SIZE, WAFFLE_SIZE - 1 - Math.floor(cell / WAFFLE_SIZE)];
    });
    cursor += count;
    return { name: slice.name, value: slice.value, cells };
  });
}

class CompositionWaffleRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return waffleSlices(data, config).length === 0;
  }

  protected emptyMessage(): string {
    return 'No positive values to display';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const slices = waffleSlices(data, config);
    return {
      tooltip: buildTooltip('item'),
      xAxis: { type: 'value', min: 0, max: WAFFLE_SIZE - 1, show: false },
      yAxis: { type: 'value', min: 0, max: WAFFLE_SIZE - 1, show: false },
      series: slices.map((slice, index) => ({
        name: slice.name,
        type: 'scatter',
        data: slice.cells,
        symbol: 'rect',
        symbolSize: 14,
        itemStyle: { color: categoricalColor(theme.colorScale, index, theme.foreground) },
      })),
      grid: buildGrid({ left: 12, right: 12, top: 12, bottom: 12 }),
    };
  }
}

chartRegistry.register({
  type: 'composition_waffle',
  family: 'composition',
  name: 'Composition Waffle',
  description: 'Part-to-whole proportions represented as a fixed 10 by 10 grid',
  renderer: 'echarts',
  compatibleShapes: ['category_numeric', 'generic'],
  requiredColumns: [
    { role: 'category', acceptedTypes: ['category', 'text'], label: 'Category' },
    { role: 'value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Value' },
  ],
  createRenderer: () => new CompositionWaffleRenderer(),
});
