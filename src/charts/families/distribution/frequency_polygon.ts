import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { resolveOptions } from '@/charts/resolve-options';
import { categoricalColor } from '@/lib/categoricalColor';
import { histogramBins } from '@/charts/echarts/histogramBins';
import type { ChartOptionSpec } from '@/charts/option-spec';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

const optionSpecs: ChartOptionSpec[] = [
  { key: 'bins', label: 'Bins', control: 'number', default: 10, min: 2, max: 100, step: 1 },
];

function finiteValues(data: DataView, config: ChartConfig): number[] {
  const col = config.columns['value'];
  return (data.columnArrays[col] ?? []).filter((v): v is number => Number.isFinite(v));
}

class FrequencyPolygonRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return finiteValues(data, config).length === 0;
  }

  protected emptyMessage(): string {
    return 'No numeric values to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const values = finiteValues(data, config);
    const bins = resolveOptions(optionSpecs, config.options).bins as number;
    const { binCenters, counts } = histogramBins(values, bins);

    const color = categoricalColor(theme.colorScale, 0, theme.foreground);
    const axes = buildCartesianAxes(theme, { type: 'value' }, { type: 'value', axisLine: false });

    return {
      tooltip: buildTooltip('axis'),
      xAxis: axes.xAxis,
      yAxis: axes.yAxis,
      series: [{
        type: 'line',
        smooth: false,
        showSymbol: true,
        areaStyle: {},
        data: binCenters.map((center, i) => [center, counts[i]]),
        lineStyle: { color },
        itemStyle: { color },
      }],
      grid: buildGrid(),
    };
  }
}

chartRegistry.register({
  type: 'frequency_polygon',
  family: 'distribution',
  name: 'Frequency Polygon',
  description: 'Line through histogram bin-center frequencies',
  renderer: 'echarts',
  compatibleShapes: ['single_numeric', 'category_numeric', 'generic'],
  requiredColumns: [{ role: 'value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Value' }],
  options: optionSpecs,
  createRenderer: () => new FrequencyPolygonRenderer(),
});
