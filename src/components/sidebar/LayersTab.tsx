import { Eye, EyeOff } from 'lucide-react';
import { useChartStore } from '@/stores/chart-store';

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
          className="flex items-center justify-between px-2 py-1.5 rounded text-xs"
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
