import { chartRegistry } from '@/charts/registry';
import { Canvas2DBaseRenderer } from '@/charts/renderers/canvas2d-renderer';
import { resolveOptions } from '@/charts/resolve-options';
import { reduceFiniteValues, type FiniteReduceOp } from '@/data/stats/reduceFiniteValues';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartOptionSpec } from '@/charts/option-spec';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';
import type { Canvas2DSize } from '@/charts/renderers/Canvas2DChart';

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

class GaugeRenderer extends Canvas2DBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return finiteValues(data, config).length === 0;
  }

  protected emptyMessage(): string {
    return 'No numeric value to chart';
  }

  draw(
    context: CanvasRenderingContext2D,
    size: Canvas2DSize,
    data: DataView,
    config: ChartConfig,
    theme: ThemeTokens,
  ): void {
    const values = finiteValues(data, config);
    const value = Math.round(reduceFiniteValues(values, aggregateOp(config)) * 100) / 100;
    const maxFinite = reduceFiniteValues(values, 'max');
    const max = maxFinite > 0 ? maxFinite : 100;
    const ratio = Math.max(0, Math.min(1, value / max));
    const accent = categoricalColor(theme.colorScale, 0, theme.foreground);

    const centerX = size.width / 2;
    const centerY = size.height * 0.64;
    const radius = Math.max(16, Math.min(size.width * 0.32, size.height * 0.48));
    const lineWidth = Math.max(10, radius * 0.13);
    const startAngle = Math.PI;
    const endAngle = 0;
    const valueAngle = startAngle + (endAngle - startAngle) * ratio;

    context.save();
    context.lineCap = 'round';
    context.lineWidth = lineWidth;

    context.beginPath();
    context.strokeStyle = theme.gridColor;
    context.arc(centerX, centerY, radius, startAngle, endAngle, false);
    context.stroke();

    context.beginPath();
    context.strokeStyle = accent;
    context.arc(centerX, centerY, radius, startAngle, valueAngle, false);
    context.stroke();

    context.fillStyle = theme.foreground;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = `${theme.fontSize.large * 2}px ${theme.fontFamily}`;
    context.fillText(value.toFixed(2), centerX, centerY - radius * 0.1);

    context.font = `${theme.fontSize.small}px ${theme.fontFamily}`;
    context.fillStyle = theme.axisColor;
    context.fillText(`0 - ${max.toFixed(2)}`, centerX, centerY + radius * 0.34);
    context.restore();
  }
}

chartRegistry.register({
  type: 'gauge',
  family: 'specialized',
  name: 'Gauge',
  description: 'Single KPI value shown on a radial gauge',
  renderer: 'canvas2d',
  compatibleShapes: ['single_numeric', 'generic'],
  requiredColumns: [{ role: 'value', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Value' }],
  options: optionSpecs,
  createRenderer: () => new GaugeRenderer(),
});
