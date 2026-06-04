import { useChartStore } from '@/stores/chart-store';

export function LayersTab() {
  const layers = useChartStore((s) => s.layers);
  const activeLayerIndex = useChartStore((s) => s.activeLayerIndex);
  const setActiveLayer = useChartStore((s) => s.setActiveLayer);
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
          }}
        >
          <button type="button" onClick={() => setActiveLayer(i)} className="truncate text-left">
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
