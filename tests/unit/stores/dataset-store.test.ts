import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDatasetStore, useActiveDataset } from '@/stores/dataset-store';
import type { DataSet } from '@/types/data';

function makeDS(id: string, name: string): DataSet {
  return {
    id,
    name,
    rows: [],
    columnArrays: {},
    columns: [],
    rowCount: 0,
    shape: 'generic',
    fileSize: 0,
    loadedAt: new Date(),
  };
}

describe('useDatasetStore', () => {
  beforeEach(() => {
    useDatasetStore.setState({
      datasets: new Map(),
      activeDatasetId: null,
      isLoading: false,
      loadProgress: 0,
    });
  });

  it('adds a dataset and makes it active', () => {
    const ds = makeDS('a', 'file-a');
    useDatasetStore.getState().addDataset(ds);
    const state = useDatasetStore.getState();
    expect(state.datasets.get('a')).toBe(ds);
    expect(state.activeDatasetId).toBe('a');
    expect(state.isLoading).toBe(false);
    expect(state.loadProgress).toBe(100);
  });

  it('removes a dataset and rotates activeId when the active one is removed', () => {
    const { addDataset, removeDataset } = useDatasetStore.getState();
    addDataset(makeDS('a', 'a'));
    addDataset(makeDS('b', 'b'));
    useDatasetStore.setState({ activeDatasetId: 'a' });
    removeDataset('a');
    const state = useDatasetStore.getState();
    expect(state.datasets.has('a')).toBe(false);
    expect(state.activeDatasetId).toBe('b');
  });

  it('preserves activeId when a non-active dataset is removed', () => {
    const { addDataset, removeDataset } = useDatasetStore.getState();
    addDataset(makeDS('a', 'a'));
    addDataset(makeDS('b', 'b'));
    useDatasetStore.setState({ activeDatasetId: 'b' });
    removeDataset('a');
    expect(useDatasetStore.getState().activeDatasetId).toBe('b');
  });

  it('sets activeId to null when the last dataset is removed', () => {
    useDatasetStore.getState().addDataset(makeDS('a', 'a'));
    useDatasetStore.getState().removeDataset('a');
    expect(useDatasetStore.getState().activeDatasetId).toBeNull();
  });

  it('setActive + setLoading reflect in state', () => {
    useDatasetStore.getState().setActive('foo');
    expect(useDatasetStore.getState().activeDatasetId).toBe('foo');
    useDatasetStore.getState().setLoading(true, 42);
    const s = useDatasetStore.getState();
    expect(s.isLoading).toBe(true);
    expect(s.loadProgress).toBe(42);
    useDatasetStore.getState().setLoading(false);
    expect(useDatasetStore.getState().loadProgress).toBe(0);
  });
});

describe('useActiveDataset', () => {
  beforeEach(() => {
    useDatasetStore.setState({
      datasets: new Map(),
      activeDatasetId: null,
      isLoading: false,
      loadProgress: 0,
    });
  });

  it('returns undefined when no dataset is active', () => {
    const { result } = renderHook(() => useActiveDataset());
    expect(result.current).toBeUndefined();
  });

  it('returns the dataset matching activeDatasetId', () => {
    const ds = makeDS('a', 'a');
    useDatasetStore.getState().addDataset(ds);
    const { result } = renderHook(() => useActiveDataset());
    expect(result.current).toBe(ds);
  });
});
