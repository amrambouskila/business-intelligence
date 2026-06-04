import { chartRegistry } from '@/charts/registry';
import { useChartStore } from '@/stores/chart-store';
import { resolveOptions } from '@/charts/resolve-options';
import type { ChartOptionSpec } from '@/charts/option-spec';
import { NumberOption } from './controls/NumberOption';
import { ToggleOption } from './controls/ToggleOption';
import { SelectOption } from './controls/SelectOption';
import { ColorOption } from './controls/ColorOption';

// Default slider domain for a 'number' option whose spec omits explicit bounds.
const DEFAULT_NUMBER_MIN = 0;
const DEFAULT_NUMBER_MAX = 100;
const DEFAULT_NUMBER_STEP = 1;

/**
 * Per-chart configuration panel. Renders controls declaratively from the active
 * chart's `options` schema — no per-chart-type branches, so a new chart's
 * controls appear automatically by declaring `options` in its ChartDefinition.
 */
export function ChartOptionsPanel() {
  const layers = useChartStore((s) => s.layers);
  const activeIdx = useChartStore((s) => s.activeLayerIndex);
  const updateLayer = useChartStore((s) => s.updateLayer);
  const layer = layers[activeIdx];

  if (!layer) {
    return (
      <p className="text-xs py-4" style={{ color: 'var(--text-muted)' }}>
        Add a chart layer to configure options
      </p>
    );
  }

  const def = chartRegistry.get(layer.chartType);
  if (!def) return null;

  const specs = def.options ?? [];
  const values = resolveOptions(specs, layer.options);

  function setOption(key: string, value: unknown) {
    updateLayer(activeIdx, { options: { ...layer!.options, [key]: value } });
  }

  return (
    <div className="flex flex-col gap-3">
      <h4 className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
        {def.name} Options
      </h4>
      {specs.length === 0 ? (
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          No options for this chart
        </p>
      ) : (
        specs.map((spec) => renderControl(spec, values[spec.key], setOption))
      )}
    </div>
  );
}

function renderControl(
  spec: ChartOptionSpec,
  value: number | boolean | string,
  setOption: (key: string, value: unknown) => void,
) {
  switch (spec.control) {
    case 'number':
      return (
        <NumberOption
          key={spec.key}
          label={spec.label}
          value={value as number}
          min={spec.min ?? DEFAULT_NUMBER_MIN}
          max={spec.max ?? DEFAULT_NUMBER_MAX}
          step={spec.step ?? DEFAULT_NUMBER_STEP}
          onChange={(v) => setOption(spec.key, v)}
        />
      );
    case 'toggle':
      return (
        <ToggleOption
          key={spec.key}
          label={spec.label}
          value={value as boolean}
          onChange={(v) => setOption(spec.key, v)}
        />
      );
    case 'select':
      return (
        <SelectOption
          key={spec.key}
          label={spec.label}
          value={value as string}
          choices={spec.choices ?? []}
          onChange={(v) => setOption(spec.key, v)}
        />
      );
    case 'color':
      return (
        <ColorOption
          key={spec.key}
          label={spec.label}
          value={value as string}
          onChange={(v) => setOption(spec.key, v)}
        />
      );
  }
}
