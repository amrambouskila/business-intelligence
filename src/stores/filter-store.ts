import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Filter } from '@/types/data';

interface FilterState {
  filters: Filter[];
  addFilter: (f: Omit<Filter, 'id' | 'active'>) => void;
  removeFilter: (id: string) => void;
  toggleFilter: (id: string) => void;
  clearFilters: () => void;
}

let filterCounter = 0;

export const useFilterStore = create<FilterState>()(
  immer((set) => ({
  filters: [],

  addFilter: (f) =>
    set((s) => {
      s.filters.push({ ...f, id: `filter-${++filterCounter}`, active: true });
    }),

  removeFilter: (id) =>
    set((s) => {
      const index = s.filters.findIndex((f) => f.id === id);
      if (index >= 0) {
        s.filters.splice(index, 1);
      }
    }),

  toggleFilter: (id) =>
    set((s) => {
      const filter = s.filters.find((f) => f.id === id);
      if (filter) {
        filter.active = !filter.active;
      }
    }),

  clearFilters: () => set({ filters: [] }),
})),
);
