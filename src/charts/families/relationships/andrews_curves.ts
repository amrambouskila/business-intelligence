import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { finiteNumericRows } from '@/charts/echarts/multivariate';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

const ROLES = ['f1', 'f2', 'f3'];
const T_VALUES = Array.from({ length: 41 }, (_v, i) => -Math.PI + (i / 40) * Math.PI * 2);

function andrewsValue(row: number[], t: number): number {
  return row.reduce((sum, value, i) => {
    if (i === 0) return sum + value / Math.SQRT2;
    const harmonic = Math.ceil(i / 2);
    return sum + value * (i % 2 === 1 ? Math.sin(harmonic * t) : Math.cos(harmonic * t));
  }, 0);
}

class AndrewsCurvesRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return finiteNumericRows(data, config, ROLES).rows.length === 0;
  }

  protected emptyMessage(): string {
    return 'No numeric feature rows to transform';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const rows = finiteNumericRows(data, config, ROLES).rows.slice(0, 40);
    const axes = buildCartesianAxes(theme, { type: 'value', name: 't', nameGap: 25 }, { type: 'value', name: 'f(t)', nameGap: 42, axisLine: false });
    return {
      tooltip: buildTooltip('axis'),
      xAxis: axes.xAxis,
      yAxis: axes.yAxis,
      series: rows.map((row, i) => ({
        name: `Row ${i + 1}`,
        type: 'line',
        showSymbol: false,
        data: T_VALUES.map((t) => [t, andrewsValue(row, t)]),
        lineStyle: { color: categoricalColor(theme.colorScale, i, theme.foreground), opacity: 0.35, width: 1.2 },
      })),
      grid: buildGrid({ bottom: 50 }),
    };
  }
}

chartRegistry.register({
  type: 'andrews_curves',
  family: 'relationships',
  name: 'Andrews Curves',
  description: 'Multivariate rows transformed into Fourier-like Andrews curves',
  renderer: 'echarts',
  compatibleShapes: ['three_numeric', 'many_numeric', 'generic'],
  requiredColumns: [
    { role: 'f1', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Feature 1' },
    { role: 'f2', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Feature 2' },
    { role: 'f3', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Feature 3' },
  ],
  createRenderer: () => new AndrewsCurvesRenderer(),
});
