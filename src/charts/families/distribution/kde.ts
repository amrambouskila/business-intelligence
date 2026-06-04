import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { resolveOptions } from '@/charts/resolve-options';
import { categoricalColor } from '@/lib/categoricalColor';
import { kernelDensity } from '@/data/stats/kernelDensity';
import type { ChartOptionSpec } from '@/charts/option-spec';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

const optionSpecs: ChartOptionSpec[] = [
  { key: 'bandwidth', label: 'Bandwidth', control: 'number', default: 0, min: 0, max: 10, step: 0.1 },
];

function finiteValues(data: DataView, config: ChartConfig): number[] {
  const col = config.columns['value'];
  return (data.columnArrays[col] ?? []).filter((v): v is number => Number.isFinite(v));
}

class KdeRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return finiteValues(data, config).length === 0;
  }

  protected emptyMessage(): string {
    return 'No numeric values to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const values = finiteValues(data, config);
    const bw = resolveOptions(optionSpecs, config.options).bandwidth as number;
    // bandwidth 0 means "auto": pass undefined so kernelDensity uses Silverman's rule.
    const curve = kernelDensity(values, { bandwidth: bw > 0 ? bw : undefined });

    const color = categoricalColor(theme.colorScale, 0, theme.foreground);
    const axes = buildCartesianAxes(theme, { type: 'value' }, { type: 'value', axisLine: false });

    return {
      tooltip: buildTooltip('axis'),
      xAxis: axes.xAxis,
      yAxis: axes.yAxis,
      series: [{
        type: 'line',
        smooth: true,
        areaStyle: {},
        showSymbol: false,
        data: curve.map((p) => [p.x, p.y]),
        lineStyle: { color },
        itemStyle: { color },
      }],
      grid: buildGrid(),
    };
  }
}

chartRegistry.register({
  type: 'kde',
  family: 'distribution',
  name: 'Density (KDE)',
  description: 'Kernel density estimate of a single numeric variable',
  renderer: 'echarts',
  compatibleShapes: ['single_numeric', 'category_numeric', 'generic'],
  requiredColumns: [{ role: 'value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Value' }],
  options: optionSpecs,
  createRenderer: () => new KdeRenderer(),
});
