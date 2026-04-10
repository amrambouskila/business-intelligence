import { useMemo } from 'react';
import { BarChart3 } from 'lucide-react';
import { chartRegistry } from '@/charts/registry';
import { useChartStore } from '@/stores/chart-store';
import { useActiveDataset } from '@/stores/dataset-store';
import { useFilterStore } from '@/stores/filter-store';
import { useTheme } from '@/theme/theme-provider';
import { applyFilters } from '@/data/transforms';
import type { ChartConfig } from '@/charts/types';

export function ChartArea() {
  const dataset = useActiveDataset();
  const layers = useChartStore((s) => s.layers);
  const activeIdx = useChartStore((s) => s.activeLayerIndex);
  const filters = useFilterStore((s) => s.filters);
  const theme = useTheme();

  const dataView = useMemo(() => {
    if (!dataset) return null;
    return applyFilters(dataset, filters);
  }, [dataset, filters]);

  const activeLayer = layers[activeIdx];

  if (!dataset || !dataView) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="text-center">
          <BarChart3 size={48} className="mx-auto mb-3" style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Upload data to start charting
          </p>
        </div>
      </div>
    );
  }

  if (!activeLayer) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="text-center">
          <BarChart3 size={48} className="mx-auto mb-3" style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Pick a chart type from the sidebar
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            {dataset.rowCount} rows loaded from {dataset.name}
          </p>
        </div>
      </div>
    );
  }

  const def = chartRegistry.get(activeLayer.chartType);
  if (!def) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <p className="text-sm" style={{ color: 'var(--danger)' }}>
          Unknown chart type: {activeLayer.chartType}
        </p>
      </div>
    );
  }

  // Auto-assign columns if not set
  const config: ChartConfig = {
    chartType: activeLayer.chartType,
    columns: { ...activeLayer.columns },
    options: activeLayer.options,
  };

  // If columns aren't assigned yet, auto-pick from dataset
  for (const req of def.requiredColumns) {
    if (!config.columns[req.role]) {
      const match = dataset.columns.find((c) => req.acceptedTypes.includes(c.type));
      if (match) config.columns[req.role] = match.name;
    }
  }

  const renderer = def.createRenderer();

  return (
    <div className="flex-1 relative" style={{ background: 'var(--bg-primary)' }}>
      {/* Column assignment bar */}
      <div
        className="flex items-center gap-2 px-3 py-1.5 border-b text-xs"
        style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}
      >
        <span className="font-medium">{def.name}</span>
        {def.requiredColumns.map((req) => (
          <ColumnPicker
            key={req.role}
            label={req.label}
            value={config.columns[req.role] ?? ''}
            columns={dataset.columns
              .filter((c) => req.acceptedTypes.includes(c.type))
              .map((c) => c.name)}
            onChange={(col) => {
              const idx = useChartStore.getState().activeLayerIndex;
              useChartStore.getState().updateLayer(idx, {
                columns: { ...config.columns, [req.role]: col },
              });
            }}
          />
        ))}
      </div>

      {/* Chart canvas */}
      <div className="absolute inset-0 top-9">
        {renderer.render(dataView, config, theme)}
      </div>
    </div>
  );
}

function ColumnPicker({
  label,
  value,
  columns,
  onChange,
}: {
  label: string;
  value: string;
  columns: string[];
  onChange: (col: string) => void;
}) {
  return (
    <label className="flex items-center gap-1">
      <span style={{ color: 'var(--text-muted)' }}>{label}:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-1.5 py-0.5 rounded text-xs"
        style={{
          background: 'var(--bg-tertiary)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border)',
        }}
      >
        <option value="">--</option>
        {columns.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
    </label>
  );
}
