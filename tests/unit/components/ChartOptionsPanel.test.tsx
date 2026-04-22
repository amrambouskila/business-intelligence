import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChartOptionsPanel } from '@/components/sidebar/ChartOptionsPanel';
import { chartRegistry } from '@/charts/registry';
import { useChartStore } from '@/stores/chart-store';
import type { ChartDefinition } from '@/charts/types';

function ensureStub(type: string): void {
  if (chartRegistry.get(type)) return;
  const def: ChartDefinition = {
    type, family: 'distribution', name: type, description: '', renderer: 'echarts',
    compatibleShapes: ['generic'], requiredColumns: [],
    createRenderer: () => ({ render: () => null as never }),
  };
  chartRegistry.register(def);
}

describe('ChartOptionsPanel', () => {
  beforeEach(() => {
    useChartStore.setState({ layers: [], activeLayerIndex: 0 });
    ensureStub('histogram');
    ensureStub('line');
    ensureStub('scatter');
    ensureStub('__opt_unknown_type__');
  });

  it('shows an empty message when no layer exists', () => {
    render(<ChartOptionsPanel />);
    expect(screen.getByText('Add a chart layer to configure options')).toBeInTheDocument();
  });

  it('renders the histogram bin control', () => {
    useChartStore.setState({
      layers: [{ id: 'l1', chartType: 'histogram', columns: {}, axis: 'y1', options: {}, visible: true }],
      activeLayerIndex: 0,
    });
    render(<ChartOptionsPanel />);
    expect(screen.getByText('Bins')).toBeInTheDocument();
  });

  it('updates an option via the range input', () => {
    useChartStore.setState({
      layers: [{ id: 'l1', chartType: 'histogram', columns: {}, axis: 'y1', options: { bins: 30 }, visible: true }],
      activeLayerIndex: 0,
    });
    render(<ChartOptionsPanel />);
    const range = screen.getAllByRole('slider')[0];
    fireEvent.change(range, { target: { value: '50' } });
    expect(useChartStore.getState().layers[0].options.bins).toBe(50);
  });

  it('renders the line chart smooth toggle and toggles it', () => {
    useChartStore.setState({
      layers: [{ id: 'l1', chartType: 'line', columns: {}, axis: 'y1', options: {}, visible: true }],
      activeLayerIndex: 0,
    });
    render(<ChartOptionsPanel />);
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    expect(useChartStore.getState().layers[0].options.smooth).toBe(true);
  });

  it('renders the scatter point-size control and updates via slider', () => {
    useChartStore.setState({
      layers: [{ id: 'l1', chartType: 'scatter', columns: {}, axis: 'y1', options: {}, visible: true }],
      activeLayerIndex: 0,
    });
    render(<ChartOptionsPanel />);
    expect(screen.getByText('Point Size')).toBeInTheDocument();
    const [pointSize] = screen.getAllByRole('slider');
    fireEvent.change(pointSize, { target: { value: '12' } });
    expect(useChartStore.getState().layers[0].options.pointSize).toBe(12);
  });

  it('updates opacity via the general slider', () => {
    useChartStore.setState({
      layers: [{ id: 'l1', chartType: 'histogram', columns: {}, axis: 'y1', options: {}, visible: true }],
      activeLayerIndex: 0,
    });
    render(<ChartOptionsPanel />);
    const sliders = screen.getAllByRole('slider');
    // Last slider is Opacity
    fireEvent.change(sliders[sliders.length - 1], { target: { value: '0.4' } });
    expect(useChartStore.getState().layers[0].options.opacity).toBeCloseTo(0.4);
  });

  it('returns null for an unknown chart type', () => {
    useChartStore.setState({
      layers: [{ id: 'l1', chartType: '__not_in_registry__', columns: {}, axis: 'y1', options: {}, visible: true }],
      activeLayerIndex: 0,
    });
    const { container } = render(<ChartOptionsPanel />);
    expect(container.firstChild).toBeNull();
  });
});
