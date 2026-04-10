import { create } from 'zustand';
import type { Filter } from '@/types/data';

interface FilterState {
  filters: Filter[];
  addFilter: (f: Omit<Filter, 'id' | 'active'>) => void;
  removeFilter: (id: string) => void;
  toggleFilter: (id: string) => void;
  clearFilters: () => void;
}

let filterCounter = 0;

export const useFilterStore = create<FilterState>((set) => ({
  filters: [],

  addFilter: (f) =>
    set((s) => ({
      filters: [...s.filters, { ...f, id: `filter-${++filterCounter}`, active: true }],
    })),

  removeFilter: (id) =>
    set((s) => ({ filters: s.filters.filter((f) => f.id !== id) })),

  toggleFilter: (id) =>
    set((s) => ({
      filters: s.filters.map((f) => (f.id === id ? { ...f, active: !f.active } : f)),
    })),

  clearFilters: () => set({ filters: [] }),
}));
