import { useRef, useState } from 'react';
import { Upload, Sun, Moon, BarChart3, Loader2, AlertCircle, Database } from 'lucide-react';
import { useUIStore } from '@/stores/ui-store';
import { useDatasetStore } from '@/stores/dataset-store';
import { loadFile } from '@/data/loader';
import { getSampleOptions, loadSampleData, type SampleKey } from '@/data/sample-data';

export function Toolbar() {
  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const addDataset = useDatasetStore((s) => s.addDataset);
  const isLoading = useDatasetStore((s) => s.isLoading);
  const setLoading = useDatasetStore((s) => s.setLoading);
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSamples, setShowSamples] = useState(false);

  function handleSample(key: SampleKey) {
    setError(null);
    setShowSamples(false);
    try {
      const ds = loadSampleData(key);
      addDataset(ds);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sample');
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      setLoading(true);
      const ds = await loadFile(file);
      addDataset(ds);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load file';
      setError(msg);
      setLoading(false);
    }
    if (fileRef.current) fileRef.current.value = '';
  }

  return (
    <header
      className="flex items-center justify-between px-4 h-12 border-b shrink-0"
      style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}
    >
      <div className="flex items-center gap-3">
        <BarChart3 size={20} style={{ color: 'var(--accent)' }} />
        <span className="font-semibold text-sm tracking-wide">Business Intelligence</span>
      </div>

      <div className="flex items-center gap-2">
        {error && (
          <div className="flex items-center gap-1 text-xs px-2 py-1 rounded" style={{ color: 'var(--danger)' }}>
            <AlertCircle size={12} />
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-1 font-bold">x</button>
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept=".csv,.tsv,.json"
          className="hidden"
          onChange={handleFile}
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors"
          style={{
            background: isLoading ? 'var(--text-muted)' : 'var(--accent)',
            color: '#fff',
            cursor: isLoading ? 'not-allowed' : 'pointer',
          }}
        >
          {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          {isLoading ? 'Loading...' : 'Upload'}
        </button>

        <div className="relative">
          <button
            onClick={() => setShowSamples(!showSamples)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors"
            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
          >
            <Database size={14} />
            Samples
          </button>
          {showSamples && (
            <div
              className="absolute right-0 top-full mt-1 py-1 rounded shadow-lg z-50 min-w-48"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
            >
              {getSampleOptions().map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleSample(opt.value)}
                  className="block w-full text-left px-3 py-1.5 text-xs transition-colors hover:opacity-80"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={toggleTheme}
          className="p-1.5 rounded transition-colors"
          style={{ color: 'var(--text-secondary)' }}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>
    </header>
  );
}
