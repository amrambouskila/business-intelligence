import { Database, BarChart3, Layers, Palette } from 'lucide-react';
import { useUIStore } from '@/stores/ui-store';
import type { SidebarTab } from '@/stores/ui-store';
import { ChartPicker } from './ChartPicker';
import { ChartOptionsPanel } from './ChartOptionsPanel';
import { DataTab } from './DataTab';
import { LayersTab } from './LayersTab';

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
      className="flex flex-col w-full h-72 shrink-0 border-b md:h-full md:w-64 md:border-b-0 md:border-r"
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
        {tab === 'style' && <ChartOptionsPanel />}
      </div>
    </aside>
  );
}
