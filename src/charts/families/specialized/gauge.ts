import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { resolveOptions } from '@/charts/resolve-options';
import { reduceFiniteValues, type FiniteReduceOp } from '@/data/stats/reduceFiniteValues';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartOptionSpec } from '@/charts/option-spec';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

const optionSpecs: ChartOptionSpec[] = [
  {
    key: 'aggregate',
    label: 'Aggregate',
    control: 'select',
    default: 'mean',
    choices: [
      { value: 'mean', label: 'Mean' },
      { value: 'max', label: 'Max' },
      { value: 'min', label: 'Min' },
      { value: 'sum', label: 'Sum' },
    ],
  },
];

function finiteValues(data: DataView, config: ChartConfig): number[] {
  const col = config.columns['value'];
  return (data.columnArrays[col] ?? []).filter((v): v is number => Number.isFinite(v));
}

/** The selected aggregate op, defaulting to 'mean' for any out-of-choices value. */
function aggregateOp(config: ChartConfig): FiniteReduceOp {
  const raw = resolveOptions(optionSpecs, config.options).aggregate;
  return raw === 'max' || raw === 'min' || raw === 'sum' ? raw : 'mean';
}

class GaugeRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return finiteValues(data, config).length === 0;
  }

  protected emptyMessage(): string {
    return 'No numeric value to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const values = finiteValues(data, config);
    // Round for display so the detail shows e.g. 59.25, not a 15-digit float artifact;
    // at 2-decimal precision the needle position is visually identical. (ECharts gauge
    // detail.formatter is unreliable here, so we round the value itself.)
    const value = Math.round(reduceFiniteValues(values, aggregateOp(config)) * 100) / 100;

    const maxFinite = reduceFiniteValues(values, 'max');
    const max = maxFinite > 0 ? maxFinite : 100;
    const accent = categoricalColor(theme.colorScale, 0, theme.foreground);

    return {
      tooltip: buildTooltip('item'),
      series: [{
        type: 'gauge',
        min: 0,
        max,
        progress: { show: true, itemStyle: { color: accent } },
        axisLine: { lineStyle: { color: [[1, accent]] } },
        pointer: { itemStyle: { color: accent } },
        detail: {
          color: theme.foreground,
          formatter: (displayValue: number) => displayValue.toFixed(2),
        },
        data: [{ value }],
      }],
    };
  }
}

chartRegistry.register({
  type: 'gauge',
  family: 'specialized',
  name: 'Gauge',
  description: 'Single KPI value shown on a radial gauge',
  renderer: 'echarts',
  compatibleShapes: ['single_numeric', 'generic'],
  requiredColumns: [{ role: 'value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Value' }],
  options: optionSpecs,
  createRenderer: () => new GaugeRenderer(),
});
