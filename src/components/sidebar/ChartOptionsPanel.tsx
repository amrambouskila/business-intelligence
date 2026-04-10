import { chartRegistry } from '@/charts/registry';
import { useChartStore } from '@/stores/chart-store';

/** Per-chart configuration panel. Renders controls based on the active chart type. */
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

  const options = layer.options;

  function setOption(key: string, value: unknown) {
    updateLayer(activeIdx, {
      options: { ...options, [key]: value },
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <h4 className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
        {def.name} Options
      </h4>

      {/* Histogram options */}
      {layer.chartType === 'histogram' && (
        <NumberOption
          label="Bins"
          value={(options['bins'] as number) ?? 30}
          min={5}
          max={200}
          step={5}
          onChange={(v) => setOption('bins', v)}
        />
      )}

      {/* Line chart options */}
      {layer.chartType === 'line' && (
        <ToggleOption
          label="Smooth"
          value={(options['smooth'] as boolean) ?? false}
          onChange={(v) => setOption('smooth', v)}
        />
      )}

      {/* Scatter plot options */}
      {layer.chartType === 'scatter' && (
        <NumberOption
          label="Point Size"
          value={(options['pointSize'] as number) ?? 6}
          min={1}
          max={20}
          step={1}
          onChange={(v) => setOption('pointSize', v)}
        />
      )}

      {/* Common options for all charts */}
      <div className="border-t pt-2 mt-1" style={{ borderColor: 'var(--border)' }}>
        <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
          General
        </h4>
        <NumberOption
          label="Opacity"
          value={(options['opacity'] as number) ?? 1.0}
          min={0.1}
          max={1.0}
          step={0.1}
          onChange={(v) => setOption('opacity', v)}
        />
      </div>
    </div>
  );
}

function NumberOption({
  label, value, min, max, step, onChange,
}: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex items-center justify-between text-xs">
      <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-20 accent-blue-500"
        />
        <span className="w-8 text-right" style={{ color: 'var(--text-muted)' }}>
          {value}
        </span>
      </div>
    </label>
  );
}

function ToggleOption({
  label, value, onChange,
}: {
  label: string; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between text-xs cursor-pointer">
      <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-blue-500"
      />
    </label>
  );
}
