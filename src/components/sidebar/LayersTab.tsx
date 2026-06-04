import { Eye, EyeOff } from 'lucide-react';
import { useChartStore } from '@/stores/chart-store';
import type { LayerConfig } from '@/stores/chart-store';

const AXES: LayerConfig['axis'][] = ['y1', 'y2'];

export function LayersTab() {
  const layers = useChartStore((s) => s.layers);
  const activeLayerIndex = useChartStore((s) => s.activeLayerIndex);
  const setActiveLayer = useChartStore((s) => s.setActiveLayer);
  const updateLayer = useChartStore((s) => s.updateLayer);
  const removeLayer = useChartStore((s) => s.removeLayer);

  if (layers.length === 0) {
    return (
      <p className="text-xs text-center py-8" style={{ color: 'var(--text-muted)' }}>
        Pick a chart type to add a layer
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {layers.map((layer, i) => (
        <div
          key={layer.id}
          className="flex items-center gap-1 px-2 py-1.5 rounded text-xs"
          style={{
            background: activeLayerIndex === i ? 'var(--accent)' : 'var(--bg-tertiary)',
            color: activeLayerIndex === i ? 'var(--bg-primary)' : 'var(--text-primary)',
            opacity: layer.visible ? 1 : 0.6,
          }}
        >
          <button
            type="button"
            onClick={() => updateLayer(i, { visible: !layer.visible })}
            className="mr-1 flex h-5 w-5 shrink-0 items-center justify-center rounded"
            style={{ color: activeLayerIndex === i ? 'var(--bg-primary)' : 'var(--text-secondary)' }}
            title={layer.visible ? `Hide ${layer.chartType}` : `Show ${layer.chartType}`}
            aria-label={layer.visible ? `Hide ${layer.chartType}` : `Show ${layer.chartType}`}
          >
            {layer.visible ? <Eye size={12} /> : <EyeOff size={12} />}
          </button>
          <button type="button" onClick={() => setActiveLayer(i)} className="min-w-0 flex-1 truncate text-left">
            {layer.chartType}
          </button>
          <div
            className="flex h-5 shrink-0 overflow-hidden rounded"
            style={{ border: `1px solid ${activeLayerIndex === i ? 'var(--bg-primary)' : 'var(--border)'}` }}
          >
            {AXES.map((axis) => (
              <button
                key={axis}
                type="button"
                onClick={() => updateLayer(i, { axis })}
                className="px-1.5 text-[10px] font-medium uppercase"
                style={{
                  background: layer.axis === axis
                    ? activeLayerIndex === i ? 'var(--bg-primary)' : 'var(--accent)'
                    : 'transparent',
                  color: layer.axis === axis
                    ? activeLayerIndex === i ? 'var(--accent)' : 'var(--bg-primary)'
                    : activeLayerIndex === i ? 'var(--bg-primary)' : 'var(--text-secondary)',
                }}
                aria-label={`Assign ${layer.chartType} to ${axis} axis`}
                title={`Assign ${layer.chartType} to ${axis} axis`}
                aria-pressed={layer.axis === axis}
              >
                {axis}
              </button>
            ))}
          </div>
          <button
            onClick={() => removeLayer(i)}
            className="text-[10px] px-1 rounded"
            style={{ color: activeLayerIndex === i ? 'var(--bg-primary)' : 'var(--danger)' }}
          >
            remove
          </button>
        </div>
      ))}
    </div>
  );
}
