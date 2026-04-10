import { Database, BarChart3, Layers, Palette } from 'lucide-react';
import { useUIStore } from '@/stores/ui-store';
import type { SidebarTab } from '@/stores/ui-store';
import { useActiveDataset } from '@/stores/dataset-store';
import { useChartStore } from '@/stores/chart-store';
import { ChartPicker } from './ChartPicker';
import { ChartOptionsPanel } from './ChartOptionsPanel';
import { formatBytes, formatNumber } from '@/lib/color';

const TABS: { key: SidebarTab; icon: typeof Database; label: string }[] = [
  { key: 'data', icon: Database, label: 'Data' },
  { key: 'charts', icon: BarChart3, label: 'Charts' },
  { key: 'layers', icon: Layers, label: 'Layers' },
  { key: 'style', icon: Palette, label: 'Style' },
];

export function Sidebar() {
  const tab = useUIStore((s) => s.sidebarTab);
  const setTab = useUIStore((s) => s.setSidebarTab);

  return (
    <aside
      className="flex flex-col w-64 shrink-0 border-r h-full"
      style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}
    >
      {/* Tab bar */}
      <div className="flex border-b" style={{ borderColor: 'var(--border)' }}>
        {TABS.map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] transition-colors"
            style={{
              color: tab === key ? 'var(--accent)' : 'var(--text-muted)',
              borderBottom: tab === key ? '2px solid var(--accent)' : '2px solid transparent',
            }}
            title={label}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-3">
        {tab === 'data' && <DataTab />}
        {tab === 'charts' && <ChartPicker />}
        {tab === 'layers' && <LayersTab />}
        {tab === 'style' && <StyleTab />}
      </div>
    </aside>
  );
}

function DataTab() {
  const ds = useActiveDataset();
  if (!ds) {
    return (
      <div className="text-center py-8">
        <Database size={32} className="mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Upload a file to get started
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h3 className="text-xs font-semibold mb-1">{ds.name}</h3>
        <div className="flex gap-3 text-[10px]" style={{ color: 'var(--text-muted)' }}>
          <span>{formatNumber(ds.rowCount, 0)} rows</span>
          <span>{ds.columns.length} cols</span>
          <span>{formatBytes(ds.fileSize)}</span>
        </div>
        <div
          className="mt-1 px-2 py-0.5 rounded text-[10px] font-medium inline-block"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          {ds.shape.replace(/_/g, ' ')}
        </div>
      </div>

      <div>
        <h4 className="text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
          Columns
        </h4>
        <div className="flex flex-col gap-1">
          {ds.columns.map((col) => (
            <div
              key={col.name}
              className="flex items-center justify-between px-2 py-1 rounded text-xs"
              style={{ background: 'var(--bg-tertiary)' }}
            >
              <span className="truncate">{col.name}</span>
              <span className="text-[10px] shrink-0 ml-2" style={{ color: 'var(--text-muted)' }}>
                {col.type}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LayersTab() {
  const layers = useChartStore((s) => s.layers);
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
          style={{ background: 'var(--bg-tertiary)' }}
        >
          <span>{layer.chartType}</span>
          <button
            onClick={() => removeLayer(i)}
            className="text-[10px] px-1 rounded"
            style={{ color: 'var(--danger)' }}
          >
            remove
          </button>
        </div>
      ))}
    </div>
  );
}

function StyleTab() {
  return <ChartOptionsPanel />;
}
