import { useEffect, useState } from 'react';
import { Toolbar } from '@/components/toolbar/Toolbar';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { ChartArea } from '@/components/chart-area/ChartArea';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { CommandPalette } from '@/components/ui/CommandPalette';
import { ThemeProvider } from '@/theme/theme-provider';

// Importing the barrel runs the eager family registrations (distribution,
// time-series, relationships) as a side effect; ensureAllFamiliesLoaded then
// registers the lazy families before the registry-reading panels mount.
import { ensureAllFamiliesLoaded } from '@/charts/families';

export function App() {
  const [familiesReady, setFamiliesReady] = useState(false);

  useEffect(() => {
    let active = true;
    ensureAllFamiliesLoaded().then(() => {
      if (active) setFamiliesReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <ThemeProvider>
      <div className="flex flex-col h-screen">
        <Toolbar />
        <CommandPalette />
        {familiesReady ? (
          <div className="flex flex-1 min-h-0 overflow-hidden flex-col md:flex-row">
            <Sidebar />
            <ErrorBoundary fallbackMessage="Chart renderer crashed">
              <ChartArea />
            </ErrorBoundary>
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-[var(--text-muted)]">
            Loading chart library…
          </div>
        )}
      </div>
    </ThemeProvider>
  );
}
