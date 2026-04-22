import { describe, it, expect, beforeEach } from 'vitest';
import { useFilterStore } from '@/stores/filter-store';

describe('useFilterStore', () => {
  beforeEach(() => {
    useFilterStore.setState({ filters: [] });
  });

  it('adds an active filter with a generated id', () => {
    useFilterStore.getState().addFilter({ column: 'v', op: 'gt', value: 10 });
    const f = useFilterStore.getState().filters;
    expect(f).toHaveLength(1);
    expect(f[0].active).toBe(true);
    expect(f[0].id).toMatch(/^filter-/);
  });

  it('removes a filter by id', () => {
    useFilterStore.getState().addFilter({ column: 'v', op: 'gt', value: 10 });
    const id = useFilterStore.getState().filters[0].id;
    useFilterStore.getState().removeFilter(id);
    expect(useFilterStore.getState().filters).toHaveLength(0);
  });

  it('toggles a filter active flag', () => {
    useFilterStore.getState().addFilter({ column: 'v', op: 'gt', value: 10 });
    const id = useFilterStore.getState().filters[0].id;
    useFilterStore.getState().toggleFilter(id);
    expect(useFilterStore.getState().filters[0].active).toBe(false);
    useFilterStore.getState().toggleFilter(id);
    expect(useFilterStore.getState().filters[0].active).toBe(true);
  });

  it('leaves non-matching filters untouched when toggling by id', () => {
    useFilterStore.getState().addFilter({ column: 'v', op: 'gt', value: 10 });
    useFilterStore.getState().addFilter({ column: 'v', op: 'lt', value: 100 });
    const firstId = useFilterStore.getState().filters[0].id;
    useFilterStore.getState().toggleFilter(firstId);
    const [a, b] = useFilterStore.getState().filters;
    expect(a.active).toBe(false);
    expect(b.active).toBe(true);
  });

  it('clears all filters', () => {
    useFilterStore.getState().addFilter({ column: 'v', op: 'gt', value: 10 });
    useFilterStore.getState().addFilter({ column: 'v', op: 'lt', value: 100 });
    useFilterStore.getState().clearFilters();
    expect(useFilterStore.getState().filters).toHaveLength(0);
  });
});
