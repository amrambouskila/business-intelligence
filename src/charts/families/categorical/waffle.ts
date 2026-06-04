import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { aggregatedCategoryValues } from '@/charts/echarts/aggregatedCategoryValues';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

interface WaffleSlice {
  name: string;
  value: number;
  count: number;
}

const WAFFLE_SIZE = 10;
const WAFFLE_CELLS = WAFFLE_SIZE * WAFFLE_SIZE;

function waffleSlices(data: DataView, config: ChartConfig): WaffleSlice[] {
  const positive = aggregatedCategoryValues(data, config).filter((p) => p.value > 0);
  const total = positive.reduce((sum, p) => sum + p.value, 0);
  if (total <= 0) return [];

  const exact = positive.map((p) => ({ name: p.name, value: p.value, raw: (p.value / total) * WAFFLE_CELLS }));
  const slices = exact.map((p) => ({ name: p.name, value: p.value, count: Math.floor(p.raw) }));
  let remainder = WAFFLE_CELLS - slices.reduce((sum, p) => sum + p.count, 0);
  const byFraction = exact
    .map((p, i) => ({ i, fraction: p.raw - Math.floor(p.raw) }))
    .sort((a, b) => b.fraction - a.fraction);

  for (const item of byFraction) {
    if (remainder <= 0) break;
    slices[item.i].count += 1;
    remainder -= 1;
  }

  return slices;
}

class WaffleRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return waffleSlices(data, config).length === 0;
  }

  protected emptyMessage(): string {
    return 'No positive values to display';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const slices = waffleSlices(data, config);
    let cursor = 0;

    return {
      tooltip: buildTooltip('item'),
      xAxis: { type: 'value', min: 0, max: WAFFLE_SIZE - 1, show: false },
      yAxis: { type: 'value', min: 0, max: WAFFLE_SIZE - 1, show: false },
      series: slices.map((slice, i) => {
        const points: number[][] = [];
        for (let c = 0; c < slice.count; c++) {
          const index = cursor + c;
          points.push([index % WAFFLE_SIZE, WAFFLE_SIZE - 1 - Math.floor(index / WAFFLE_SIZE)]);
        }
        cursor += slice.count;
        return {
          name: slice.name,
          type: 'scatter',
          data: points,
          symbol: 'rect',
          symbolSize: 14,
          itemStyle: { color: categoricalColor(theme.colorScale, i, theme.foreground) },
        };
      }),
      grid: buildGrid({ left: 12, right: 12, top: 12, bottom: 12 }),
    };
  }
}

chartRegistry.register({
  type: 'waffle',
  family: 'categorical',
  name: 'Waffle Chart',
  description: 'Part-to-whole proportions represented as a 10 by 10 grid',
  renderer: 'echarts',
  compatibleShapes: ['category_numeric', 'generic'],
  requiredColumns: [
    { role: 'category', acceptedTypes: ['category', 'text'], label: 'Category' },
    { role: 'value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Value' },
  ],
  createRenderer: () => new WaffleRenderer(),
});
