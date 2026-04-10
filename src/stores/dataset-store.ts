import { create } from 'zustand';
import type { DataSet } from '@/types/data';

interface DatasetState {
  datasets: Map<string, DataSet>;
  activeDatasetId: string | null;
  isLoading: boolean;
  loadProgress: number;
  addDataset: (ds: DataSet) => void;
  removeDataset: (id: string) => void;
  setActive: (id: string) => void;
  setLoading: (loading: boolean, progress?: number) => void;
}

export const useDatasetStore = create<DatasetState>((set) => ({
  datasets: new Map(),
  activeDatasetId: null,
  isLoading: false,
  loadProgress: 0,

  addDataset: (ds) =>
    set((s) => {
      const next = new Map(s.datasets);
      next.set(ds.id, ds);
      return { datasets: next, activeDatasetId: ds.id, isLoading: false, loadProgress: 100 };
    }),

  removeDataset: (id) =>
    set((s) => {
      const next = new Map(s.datasets);
      next.delete(id);
      const activeId = s.activeDatasetId === id ? (next.keys().next().value ?? null) : s.activeDatasetId;
      return { datasets: next, activeDatasetId: activeId };
    }),

  setActive: (id) => set({ activeDatasetId: id }),

  setLoading: (loading, progress = 0) => set({ isLoading: loading, loadProgress: progress }),
}));

/** Convenience selector: get the currently active dataset. */
export function useActiveDataset(): DataSet | undefined {
  const datasets = useDatasetStore((s) => s.datasets);
  const activeId = useDatasetStore((s) => s.activeDatasetId);
  return activeId ? datasets.get(activeId) : undefined;
}
