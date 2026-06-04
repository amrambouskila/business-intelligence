import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { histogramBins } from '@/charts/echarts/histogramBins';
import { resolveOptions } from '@/charts/resolve-options';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartOptionSpec } from '@/charts/option-spec';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

const optionSpecs: ChartOptionSpec[] = [
  { key: 'bins', label: 'Bins', control: 'number', default: 30, min: 5, max: 200, step: 5 },
];

function numericValues(data: DataView, config: ChartConfig): number[] {
  const col = config.columns['value'];
  // Number.isFinite excludes NaN/Infinity so the empty-state guard fires on an
  // all-non-finite column and binning never sees stray NaN/Infinity edges.
  return (data.columnArrays[col] ?? []).filter((v): v is number => Number.isFinite(v));
}

class HistogramRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return numericValues(data, config).length === 0;
  }

  protected emptyMessage(): string {
    return 'No numeric values to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const values = numericValues(data, config);
    const bins = resolveOptions(optionSpecs, config.options).bins as number;

    const { binEdges, counts } = histogramBins(values, bins);
    const labels = binEdges.slice(0, -1).map((e, i) => `${e.toFixed(1)} - ${binEdges[i + 1].toFixed(1)}`);
    const axes = buildCartesianAxes(theme, { type: 'category', data: labels, rotate: 45 }, { type: 'value', axisLine: false });

    return {
      tooltip: buildTooltip('axis'),
      xAxis: axes.xAxis,
      yAxis: axes.yAxis,
      series: [{
        type: 'bar',
        data: counts,
        itemStyle: { color: categoricalColor(theme.colorScale, 0, theme.foreground) },
        barWidth: '90%',
      }],
      grid: buildGrid({ bottom: 60 }),
    };
  }
}

chartRegistry.register({
  type: 'histogram',
  family: 'distribution',
  name: 'Histogram',
  description: 'Frequency distribution of a single numeric variable',
  renderer: 'echarts',
  compatibleShapes: ['single_numeric', 'category_numeric', 'many_numeric', 'generic'],
  requiredColumns: [{ role: 'value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Value' }],
  options: optionSpecs,
  createRenderer: () => new HistogramRenderer(),
});
