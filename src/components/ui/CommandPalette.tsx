import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Database, Layers, Moon, Palette, Search, Sun } from 'lucide-react';
import { useUIStore, type SidebarTab } from '@/stores/ui-store';
import { useDatasetStore } from '@/stores/dataset-store';
import { getSampleOptions, loadSampleData, type SampleKey } from '@/data/sample-data';

interface Command {
  id: string;
  label: string;
  keywords: string;
  icon: typeof Search;
  run: () => void;
}

const TAB_COMMANDS: Array<{ tab: SidebarTab; label: string; icon: typeof Search }> = [
  { tab: 'data', label: 'Show Data', icon: Database },
  { tab: 'charts', label: 'Show Charts', icon: BarChart3 },
  { tab: 'layers', label: 'Show Layers', icon: Layers },
  { tab: 'style', label: 'Show Style', icon: Palette },
];

export function CommandPalette() {
  const modal = useUIStore((s) => s.modal);
  const theme = useUIStore((s) => s.theme);
  const closeModal = useUIStore((s) => s.closeModal);
  const setSidebarTab = useUIStore((s) => s.setSidebarTab);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const addDataset = useDatasetStore((s) => s.addDataset);
  const [query, setQuery] = useState('');

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && useUIStore.getState().modal === 'command') {
        useUIStore.getState().closeModal();
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        useUIStore.getState().openModal('command');
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const commands = useMemo<Command[]>(() => {
    const tabCommands = TAB_COMMANDS.map(({ tab, label, icon }) => ({
      id: `tab-${tab}`,
      label,
      keywords: `${label} ${tab} sidebar`,
      icon,
      run: () => {
        setSidebarTab(tab);
        closeModal();
      },
    }));
    const sampleCommands = getSampleOptions().map((sample) => ({
      id: `sample-${sample.value}`,
      label: `Load ${sample.label}`,
      keywords: `load sample ${sample.label} ${sample.value}`,
      icon: Database,
      run: () => {
        addDataset(loadSampleData(sample.value as SampleKey));
        closeModal();
      },
    }));
    return [
      ...tabCommands,
      {
        id: 'theme-toggle',
        label: `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`,
        keywords: 'theme light dark mode',
        icon: theme === 'dark' ? Sun : Moon,
        run: () => {
          toggleTheme();
          closeModal();
        },
      },
      ...sampleCommands,
    ];
  }, [addDataset, closeModal, setSidebarTab, theme, toggleTheme]);

  if (modal !== 'command') return null;

  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const visibleCommands = terms.length === 0
    ? commands
    : commands.filter((command) => terms.every((term) => command.keywords.toLowerCase().includes(term)));

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-20"
      style={{ background: 'color-mix(in srgb, var(--bg-primary) 72%, transparent)' }}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeModal();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="w-full max-w-xl rounded shadow-xl"
        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
      >
        <label className="flex items-center gap-2 border-b px-3 py-2" style={{ borderColor: 'var(--border)' }}>
          <Search size={16} style={{ color: 'var(--text-muted)' }} />
          <input
            autoFocus
            aria-label="Search commands"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="w-full bg-transparent text-sm outline-none"
            style={{ color: 'var(--text-primary)' }}
          />
        </label>
        <div className="max-h-80 overflow-y-auto p-1">
          {visibleCommands.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
              No commands found
            </p>
          ) : (
            visibleCommands.map((command) => {
              const Icon = command.icon;
              return (
                <button
                  key={command.id}
                  type="button"
                  onClick={command.run}
                  className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <Icon size={15} style={{ color: 'var(--text-secondary)' }} />
                  <span>{command.label}</span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
