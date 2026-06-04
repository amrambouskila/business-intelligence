import { useState } from 'react';
import { chartRegistry } from '@/charts/registry';
import { FAMILY_META } from '@/charts/types';
import type { ChartDefinition, ChartFamily } from '@/charts/types';
import { useChartStore } from '@/stores/chart-store';
import { useActiveDataset } from '@/stores/dataset-store';
import { suggestCharts } from '@/data/chart-suggester';

export function ChartPicker() {
  const dataset = useActiveDataset();
  const addLayer = useChartStore((s) => s.addLayer);
  const [showAll, setShowAll] = useState(false);
  const [selectedFamily, setSelectedFamily] = useState<ChartFamily | null>(null);

  // Reset to suggestions when the active dataset changes (render-time state reset,
  // the React idiom — see react.dev "You Might Not Need an Effect"), so loading a
  // new dataset isn't stranded in the previous dataset's "show all" catalog.
  const [seenDatasetId, setSeenDatasetId] = useState(dataset?.id);
  if (dataset?.id !== seenDatasetId) {
    setSeenDatasetId(dataset?.id);
    setShowAll(false);
  }

  const suggestions = dataset ? suggestCharts(dataset.shape, dataset.columns) : [];

  const chartButton = (def: ChartDefinition) => (
    <button
      key={def.type}
      data-chart-type={def.type}
      onClick={() => addLayer(def.type)}
      className="text-left px-2 py-1.5 rounded text-xs transition-colors hover:opacity-80"
      style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
    >
      <span className="font-medium">{def.name}</span>
      <span className="ml-2 text-[10px]" style={{ color: 'var(--text-muted)' }}>
        {FAMILY_META[def.family]?.label}
      </span>
    </button>
  );

  // Suggested view: ranked, shape-aware charts for the active dataset.
  if (!showAll && suggestions.length > 0) {
    const shapeLabel = dataset!.shape.replace(/_/g, ' ');
    return (
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
          Suggested for {shapeLabel} data
        </label>
        <div className="flex flex-col gap-1 mt-1 max-h-64 overflow-y-auto">
          {suggestions.map(chartButton)}
        </div>
        <button
          onClick={() => setShowAll(true)}
          className="text-xs text-left mt-1 hover:opacity-80"
          style={{ color: 'var(--accent)' }}
        >
          Show all charts ({chartRegistry.count})
        </button>
      </div>
    );
  }

  // Full catalog view: browse by family.
  const families = chartRegistry.families();
  const charts = selectedFamily ? chartRegistry.getByFamily(selectedFamily) : chartRegistry.all();

  return (
    <div className="flex flex-col gap-2">
      {suggestions.length > 0 && (
        <button
          onClick={() => setShowAll(false)}
          className="text-xs text-left hover:opacity-80"
          style={{ color: 'var(--accent)' }}
        >
          ← Back to suggestions
        </button>
      )}
      <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
        Chart Family
      </label>
      <select
        value={selectedFamily ?? ''}
        onChange={(e) => setSelectedFamily((e.target.value || null) as ChartFamily | null)}
        className="w-full px-2 py-1.5 rounded text-xs"
        style={{
          background: 'var(--bg-tertiary)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border)',
        }}
      >
        <option value="">All families ({chartRegistry.count} charts)</option>
        {families.map((f) => (
          <option key={f} value={f}>
            {FAMILY_META[f]?.label ?? f} ({chartRegistry.getByFamily(f).length})
          </option>
        ))}
      </select>

      <div className="flex flex-col gap-1 mt-1 max-h-64 overflow-y-auto">
        {charts.map(chartButton)}
        {charts.length === 0 && (
          <p className="text-xs py-4 text-center" style={{ color: 'var(--text-muted)' }}>
            No charts registered yet
          </p>
        )}
      </div>
    </div>
  );
}
