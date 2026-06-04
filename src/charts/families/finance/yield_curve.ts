import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

function maturityValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Number.parseFloat(String(value).replace(/[^\d.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function finitePoints(data: DataView, config: ChartConfig): Array<[number, number]> {
  const maturities = data.columnArrays[config.columns['maturity']] ?? [];
  const yields = data.columnArrays[config.columns['yield']] ?? [];
  const points: Array<[number, number]> = [];
  const n = Math.min(maturities.length, yields.length);

  for (let i = 0; i < n; i++) {
    const maturity = maturityValue(maturities[i]);
    const value = yields[i];
    if (maturity !== null && typeof value === 'number' && Number.isFinite(value)) {
      points.push([maturity, value]);
    }
  }

  return points.sort((a, b) => a[0] - b[0]);
}

class YieldCurveRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return finitePoints(data, config).length === 0;
  }

  protected emptyMessage(): string {
    return 'No yield curve values to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const color = categoricalColor(theme.colorScale, 0, theme.foreground);
    const axes = buildCartesianAxes(
      theme,
      { type: 'value', name: config.columns['maturity'], nameGap: 30 },
      { type: 'value', name: config.columns['yield'], nameGap: 40, axisLine: false },
    );
    axes.yAxis = { ...(axes.yAxis as object), axisLabel: { color: theme.axisColor, fontSize: theme.fontSize.small, formatter: '{value}%' } };

    return {
      tooltip: buildTooltip('axis'),
      xAxis: axes.xAxis,
      yAxis: axes.yAxis,
      series: [{
        name: 'Yield',
        type: 'line',
        data: finitePoints(data, config),
        smooth: true,
        symbolSize: 7,
        lineStyle: { color, width: 2 },
        itemStyle: { color },
      }],
      grid: buildGrid({ bottom: 50 }),
    };
  }
}

chartRegistry.register({
  type: 'yield_curve',
  family: 'finance',
  name: 'Yield Curve',
  description: 'Interest-rate yield by maturity',
  renderer: 'echarts',
  compatibleShapes: ['two_numeric', 'category_numeric', 'generic'],
  requiredColumns: [
    { role: 'maturity', acceptedTypes: ['numeric', 'integer', 'float', 'category', 'text'], label: 'Maturity' },
    { role: 'yield', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Yield' },
  ],
  createRenderer: () => new YieldCurveRenderer(),
});
