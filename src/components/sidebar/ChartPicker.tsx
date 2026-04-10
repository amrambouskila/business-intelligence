import { useState } from 'react';
import { chartRegistry } from '@/charts/registry';
import { FAMILY_META } from '@/charts/types';
import type { ChartFamily } from '@/charts/types';
import { useChartStore } from '@/stores/chart-store';

export function ChartPicker() {
  const [selectedFamily, setSelectedFamily] = useState<ChartFamily | null>(null);
  const addLayer = useChartStore((s) => s.addLayer);

  const families = chartRegistry.families();
  const charts = selectedFamily ? chartRegistry.getByFamily(selectedFamily) : chartRegistry.all();

  return (
    <div className="flex flex-col gap-2">
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
        {charts.map((def) => (
          <button
            key={def.type}
            onClick={() => addLayer(def.type)}
            className="text-left px-2 py-1.5 rounded text-xs transition-colors hover:opacity-80"
            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
          >
            <span className="font-medium">{def.name}</span>
            <span className="ml-2" style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
              {FAMILY_META[def.family]?.label}
            </span>
          </button>
        ))}
        {charts.length === 0 && (
          <p className="text-xs py-4 text-center" style={{ color: 'var(--text-muted)' }}>
            No charts registered yet
          </p>
        )}
      </div>
    </div>
  );
}
