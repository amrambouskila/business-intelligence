import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useChartStore, useActiveChartConfig } from '@/stores/chart-store';

describe('useChartStore', () => {
  beforeEach(() => {
    useChartStore.setState({ layers: [], activeLayerIndex: 0 });
  });

  it('adds a layer with defaults and points activeLayerIndex at it', () => {
    useChartStore.getState().addLayer('histogram');
    const s = useChartStore.getState();
    expect(s.layers).toHaveLength(1);
    expect(s.layers[0].chartType).toBe('histogram');
    expect(s.layers[0].columns).toEqual({});
    expect(s.layers[0].axis).toBe('y1');
    expect(s.layers[0].visible).toBe(true);
    expect(s.activeLayerIndex).toBe(0);
  });

  it('appends a second layer with a unique id and advances activeLayerIndex', () => {
    useChartStore.getState().addLayer('line');
    useChartStore.getState().addLayer('scatter');
    const s = useChartStore.getState();
    expect(s.layers).toHaveLength(2);
    expect(new Set(s.layers.map((l) => l.id)).size).toBe(2);
    expect(s.activeLayerIndex).toBe(1);
  });

  it('removes a layer and clamps activeLayerIndex', () => {
    useChartStore.getState().addLayer('a');
    useChartStore.getState().addLayer('b');
    useChartStore.getState().setActiveLayer(1);
    useChartStore.getState().removeLayer(1);
    const s = useChartStore.getState();
    expect(s.layers).toHaveLength(1);
    expect(s.activeLayerIndex).toBe(0);
  });

  it('clamps activeLayerIndex to 0 when all layers are removed', () => {
    useChartStore.getState().addLayer('a');
    useChartStore.getState().removeLayer(0);
    expect(useChartStore.getState().activeLayerIndex).toBe(0);
  });

  it('patches a layer by index', () => {
    useChartStore.getState().addLayer('line');
    useChartStore.getState().updateLayer(0, { columns: { x: 'col1' } });
    expect(useChartStore.getState().layers[0].columns).toEqual({ x: 'col1' });
  });

  it('updateLayer leaves non-matching layers untouched', () => {
    useChartStore.getState().addLayer('a');
    useChartStore.getState().addLayer('b');
    useChartStore.getState().updateLayer(1, { chartType: 'b-renamed' });
    const [first, second] = useChartStore.getState().layers;
    expect(first.chartType).toBe('a');
    expect(second.chartType).toBe('b-renamed');
  });

  it('clears all layers', () => {
    useChartStore.getState().addLayer('a');
    useChartStore.getState().addLayer('b');
    useChartStore.getState().clearLayers();
    const s = useChartStore.getState();
    expect(s.layers).toHaveLength(0);
    expect(s.activeLayerIndex).toBe(0);
  });
});

describe('useActiveChartConfig', () => {
  beforeEach(() => {
    useChartStore.setState({ layers: [], activeLayerIndex: 0 });
  });

  it('returns null when no active layer', () => {
    const { result } = renderHook(() => useActiveChartConfig());
    expect(result.current).toBeNull();
  });

  it('projects the active layer into a ChartConfig', () => {
    useChartStore.getState().addLayer('histogram');
    useChartStore.getState().updateLayer(0, {
      columns: { value: 'colA' },
      options: { bins: 50 },
    });
    const { result } = renderHook(() => useActiveChartConfig());
    expect(result.current).toEqual({
      chartType: 'histogram',
      columns: { value: 'colA' },
      options: { bins: 50 },
    });
  });
});
