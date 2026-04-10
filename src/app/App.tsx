import { Toolbar } from '@/components/toolbar/Toolbar';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { ChartArea } from '@/components/chart-area/ChartArea';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { ThemeProvider } from '@/theme/theme-provider';

// Register all chart families
import '@/charts/families';

export function App() {
  return (
    <ThemeProvider>
      <div className="flex flex-col h-screen">
        <Toolbar />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <ErrorBoundary fallbackMessage="Chart renderer crashed">
            <ChartArea />
          </ErrorBoundary>
        </div>
      </div>
    </ThemeProvider>
  );
}
