import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { enableMapSet } from 'immer';
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

enableMapSet();

export const useDatasetStore = create<DatasetState>()(
  immer((set) => ({
  datasets: new Map(),
  activeDatasetId: null,
  isLoading: false,
  loadProgress: 0,

  addDataset: (ds) =>
    set((s) => {
      s.datasets.set(ds.id, ds);
      s.activeDatasetId = ds.id;
      s.isLoading = false;
      s.loadProgress = 100;
    }),

  removeDataset: (id) =>
    set((s) => {
      s.datasets.delete(id);
      if (s.activeDatasetId === id) {
        s.activeDatasetId = s.datasets.keys().next().value ?? null;
      }
    }),

  setActive: (id) => set({ activeDatasetId: id }),

  setLoading: (loading, progress = 0) => set({ isLoading: loading, loadProgress: progress }),
})),
);

/** Convenience selector: get the currently active dataset. */
export function useActiveDataset(): DataSet | undefined {
  const datasets = useDatasetStore((s) => s.datasets);
  const activeId = useDatasetStore((s) => s.activeDatasetId);
  return activeId ? datasets.get(activeId) : undefined;
}
