import { useMemo } from 'react';
import { chartRegistry } from '@/charts/registry';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

interface ChartCanvasProps {
  chartType: string;
  data: DataView;
  config: ChartConfig;
  theme: ThemeTokens;
}

/**
 * Mounts the correct renderer for a chart type. Memoizes the renderer per
 * chartType so unmount (and WebGL cleanup in deck.gl's case) only fires on
 * real chart switches — not on every upstream re-render.
 */
export function ChartCanvas({ chartType, data, config, theme }: ChartCanvasProps) {
  const renderer = useMemo(() => {
    const def = chartRegistry.get(chartType);
    return def?.createRenderer();
  }, [chartType]);
  if (!renderer) return null;
  return <>{renderer.render(data, config, theme)}</>;
}
