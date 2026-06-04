import { useMemo, useRef } from 'react';
import { BarChart3, Download, FileCode } from 'lucide-react';
import { chartRegistry } from '@/charts/registry';
import { useChartStore } from '@/stores/chart-store';
import { useActiveDataset } from '@/stores/dataset-store';
import { useFilterStore } from '@/stores/filter-store';
import { useTheme } from '@/theme/theme-context';
import { applyFilters } from '@/data/transforms';
import { exportFileName } from '@/data/export';
import { downloadChartPNG, downloadChartSVG } from '@/charts/export-image';
import type { ChartConfig, ColumnRole } from '@/charts/types';
import { ColumnPicker } from './ColumnPicker';
import { ChartCanvas } from './ChartCanvas';

export function ChartArea() {
  const chartRenderRef = useRef<HTMLDivElement>(null);
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

  const config: ChartConfig = {
    chartType: activeLayer.chartType,
    columns: { ...activeLayer.columns },
    options: activeLayer.options,
  };
  const optionalColumns = def.optionalColumns ?? [];

  // Auto-fill each unset required role: prefer a column named like the role,
  // else the first type-compatible column, and never reuse a column already
  // assigned to another role (consume-on-assign).
  const used = new Set(Object.values(config.columns));
  const unfilled: ColumnRole[] = [];
  for (const req of def.requiredColumns) {
    if (config.columns[req.role]) continue;
    const candidates = dataset.columns.filter(
      (c) => req.acceptedTypes.includes(c.type) && !used.has(c.name),
    );
    const match = candidates.find((c) => c.name.toLowerCase() === req.role.toLowerCase()) ?? candidates[0];
    if (match) {
      config.columns[req.role] = match.name;
      used.add(match.name);
    } else {
      unfilled.push(req);
    }
  }

  return (
    <div className="flex-1 relative" style={{ background: 'var(--bg-primary)' }}>
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
        {optionalColumns.map((opt) => (
          <ColumnPicker
            key={opt.role}
            label={opt.label}
            value={config.columns[opt.role] ?? ''}
            columns={dataset.columns
              .filter((c) => opt.acceptedTypes.includes(c.type))
              .map((c) => c.name)}
            onChange={(col) => {
              const idx = useChartStore.getState().activeLayerIndex;
              const columns = { ...config.columns };
              if (col) columns[opt.role] = col;
              else delete columns[opt.role];
              useChartStore.getState().updateLayer(idx, { columns });
            }}
          />
        ))}
        <button
          type="button"
          onClick={() => downloadChartPNG(
            chartRenderRef.current,
            exportFileName(dataset.name, `${config.chartType}-chart`, 'png'),
          )}
          className="ml-auto flex h-6 w-6 items-center justify-center rounded"
          style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
          title="Export chart PNG"
          aria-label="Export chart PNG"
        >
          <Download size={13} />
        </button>
        <button
          type="button"
          onClick={() => downloadChartSVG(
            chartRenderRef.current,
            exportFileName(dataset.name, `${config.chartType}-chart`, 'svg'),
          )}
          className="flex h-6 w-6 items-center justify-center rounded"
          style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
          title="Export chart SVG"
          aria-label="Export chart SVG"
        >
          <FileCode size={13} />
        </button>
      </div>

      <div
        ref={chartRenderRef}
        key={config.chartType}
        data-testid="chart-render"
        data-chart-active={config.chartType}
        data-chart-unfilled={unfilled.length > 0 ? 'true' : 'false'}
        className="absolute inset-0 top-9"
      >
        {unfilled.length > 0 ? (
          <div className="w-full h-full flex items-center justify-center text-sm" style={{ color: 'var(--text-muted)' }}>
            No compatible column for: {unfilled.map((r) => r.label).join(', ')}
          </div>
        ) : (
          <ChartCanvas chartType={config.chartType} data={dataView} config={config} theme={theme} />
        )}
      </div>
    </div>
  );
}
