import { create } from 'zustand';
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

export const useChartStore = create<ChartState>((set) => ({
  layers: [],
  activeLayerIndex: 0,

  addLayer: (chartType) =>
    set((s) => ({
      layers: [
        ...s.layers,
        {
          id: `layer-${++layerCounter}`,
          chartType,
          columns: {},
          axis: 'y1' as const,
          options: {},
          visible: true,
        },
      ],
      activeLayerIndex: s.layers.length,
    })),

  removeLayer: (index) =>
    set((s) => {
      const layers = s.layers.filter((_, i) => i !== index);
      return {
        layers,
        activeLayerIndex: Math.min(s.activeLayerIndex, Math.max(0, layers.length - 1)),
      };
    }),

  updateLayer: (index, patch) =>
    set((s) => ({
      layers: s.layers.map((l, i) => (i === index ? { ...l, ...patch } : l)),
    })),

  setActiveLayer: (index) => set({ activeLayerIndex: index }),

  clearLayers: () => set({ layers: [], activeLayerIndex: 0 }),
}));

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
