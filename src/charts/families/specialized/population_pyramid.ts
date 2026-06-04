import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

interface PopulationPyramid {
  ageBands: string[];
  groups: [string, string];
  left: number[];
  right: number[];
}

function buildPopulationPyramid(data: DataView, config: ChartConfig): PopulationPyramid {
  const ages = data.columnArrays[config.columns['age_band']] ?? [];
  const sexes = data.columnArrays[config.columns['sex']] ?? [];
  const counts = data.columnArrays[config.columns['count']] ?? [];
  const ageOrder: string[] = [];
  const sexOrder: string[] = [];
  const totals = new Map<string, number>();

  for (let i = 0; i < ages.length; i++) {
    const count = counts[i];
    if (typeof count !== 'number' || !Number.isFinite(count)) continue;
    const age = String(ages[i]);
    const sex = String(sexes[i]);
    if (!ageOrder.includes(age)) ageOrder.push(age);
    if (!sexOrder.includes(sex)) sexOrder.push(sex);
    totals.set(`${age}\u0000${sex}`, (totals.get(`${age}\u0000${sex}`) ?? 0) + count);
  }

  const groups: [string, string] = [sexOrder[0] ?? 'Left', sexOrder[1] ?? 'Right'];
  return {
    ageBands: ageOrder,
    groups,
    left: ageOrder.map((age) => {
      const value = totals.get(`${age}\u0000${groups[0]}`) ?? 0;
      return value === 0 ? 0 : -value;
    }),
    right: ageOrder.map((age) => totals.get(`${age}\u0000${groups[1]}`) ?? 0),
  };
}

class PopulationPyramidRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return buildPopulationPyramid(data, config).ageBands.length === 0;
  }

  protected emptyMessage(): string {
    return 'No population values to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const pyramid = buildPopulationPyramid(data, config);
    const axes = buildCartesianAxes(
      theme,
      { type: 'value', axisLine: false },
      { type: 'category', data: pyramid.ageBands },
    );
    (axes.xAxis as { axisLabel: Record<string, unknown> }).axisLabel.formatter =
      (value: number) => Math.abs(value).toString();

    return {
      tooltip: buildTooltip('axis', { axisPointer: { type: 'shadow' } }),
      legend: { bottom: 0, textStyle: { color: theme.foreground } },
      xAxis: axes.xAxis,
      yAxis: axes.yAxis,
      grid: buildGrid({ left: 96, bottom: 52 }),
      series: [
        {
          type: 'bar',
          name: pyramid.groups[0],
          stack: 'population',
          data: pyramid.left,
          itemStyle: { color: categoricalColor(theme.colorScale, 0, theme.foreground) },
        },
        {
          type: 'bar',
          name: pyramid.groups[1],
          stack: 'population',
          data: pyramid.right,
          itemStyle: { color: categoricalColor(theme.colorScale, 1, theme.foreground) },
        },
      ],
    };
  }
}

chartRegistry.register({
  type: 'population_pyramid',
  family: 'specialized',
  name: 'Population Pyramid',
  description: 'Age-band counts mirrored by population segment',
  renderer: 'echarts',
  compatibleShapes: ['category_numeric', 'generic'],
  requiredColumns: [
    { role: 'age_band', acceptedTypes: ['category', 'text'], label: 'Age Band' },
    { role: 'sex', acceptedTypes: ['category', 'text'], label: 'Segment' },
    { role: 'count', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Count' },
  ],
  createRenderer: () => new PopulationPyramidRenderer(),
});
