import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { ChartConfig } from '@/charts/types';

export interface LayerConfig {
  id: string;
  chartType: string;
  columns: Record<string, string>;
  axis: 'y1' | 'y2';
  options: Record<string, unknown>;
  visible: boolean;
}

interface ChartState {
  layers: LayerConfig[];
  activeLayerIndex: number;
  addLayer: (chartType: string) => void;
  removeLayer: (index: number) => void;
  updateLayer: (index: number, patch: Partial<LayerConfig>) => void;
  setActiveLayer: (index: number) => void;
  clearLayers: () => void;
}

let layerCounter = 0;

export const useChartStore = create<ChartState>()(
  immer((set) => ({
  layers: [],
  activeLayerIndex: 0,

  addLayer: (chartType) =>
    set((s) => {
      s.layers.push({
        id: `layer-${++layerCounter}`,
        chartType,
        columns: {},
        axis: 'y1',
        options: {},
        visible: true,
      });
      s.activeLayerIndex = s.layers.length - 1;
    }),

  removeLayer: (index) =>
    set((s) => {
      s.layers.splice(index, 1);
      s.activeLayerIndex = Math.min(s.activeLayerIndex, Math.max(0, s.layers.length - 1));
    }),

  updateLayer: (index, patch) =>
    set((s) => {
      const layer = s.layers[index];
      if (layer) {
        Object.assign(layer, patch);
      }
    }),

  setActiveLayer: (index) => set({ activeLayerIndex: index }),

  clearLayers: () => set({ layers: [], activeLayerIndex: 0 }),
})),
);

/** Build a ChartConfig from the active layer. */
export function useActiveChartConfig(): ChartConfig | null {
  const layers = useChartStore((s) => s.layers);
  const idx = useChartStore((s) => s.activeLayerIndex);
  const layer = layers[idx];
  if (!layer) return null;
  return {
    chartType: layer.chartType,
    columns: layer.columns,
    options: layer.options,
  };
}
