import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('echarts-for-react', () => ({
  default: () => <div data-testid="mock-echarts" />,
}));

import { ChartArea } from '@/components/chart-area/ChartArea';
import { useChartStore } from '@/stores/chart-store';
import { useDatasetStore } from '@/stores/dataset-store';
import { useFilterStore } from '@/stores/filter-store';
import { chartRegistry } from '@/charts/registry';
import type { ChartDefinition } from '@/charts/types';
import type { DataSet } from '@/types/data';

const stub: ChartDefinition = {
  type: '__area_stub__',
  family: 'distribution',
  name: 'Area Stub',
  description: '',
  renderer: 'echarts',
  compatibleShapes: ['generic'],
  requiredColumns: [
    { role: 'value', acceptedTypes: ['integer', 'float'], label: 'Value' },
  ],
  createRenderer: () => ({ render: () => <div data-testid="stub-chart" /> }),
};

function makeDS(): DataSet {
  return {
    id: 'd1', name: 'test.csv',
    rows: [{ v: 1 }, { v: 2 }, { v: 3 }],
    columnArrays: { v: [1, 2, 3] },
    columns: [{ name: 'v', type: 'integer', nullable: false, uniqueCount: 3, nullCount: 0 }],
    rowCount: 3, shape: 'single_numeric', fileSize: 0, loadedAt: new Date(),
  };
}

describe('ChartArea', () => {
  beforeEach(() => {
    useChartStore.setState({ layers: [], activeLayerIndex: 0 });
    useDatasetStore.setState({ datasets: new Map(), activeDatasetId: null, isLoading: false, loadProgress: 0 });
    useFilterStore.setState({ filters: [] });
    if (!chartRegistry.get(stub.type)) chartRegistry.register(stub);
  });

  it('shows the "Upload data" empty state when there is no active dataset', () => {
    render(<ChartArea />);
    expect(screen.getByText('Upload data to start charting')).toBeInTheDocument();
  });

  it('shows the "Pick a chart type" state when a dataset but no layer is present', () => {
    useDatasetStore.getState().addDataset(makeDS());
    render(<ChartArea />);
    expect(screen.getByText('Pick a chart type from the sidebar')).toBeInTheDocument();
  });

  it('shows an error when the active layer references an unknown chart type', () => {
    useDatasetStore.getState().addDataset(makeDS());
    useChartStore.setState({
      layers: [{ id: 'l1', chartType: 'totally-made-up', columns: {}, axis: 'y1', options: {}, visible: true }],
      activeLayerIndex: 0,
    });
    render(<ChartArea />);
    expect(screen.getByText(/Unknown chart type: totally-made-up/)).toBeInTheDocument();
  });

  it('renders the column assignment bar + delegates to the renderer for the active layer', () => {
    useDatasetStore.getState().addDataset(makeDS());
    useChartStore.setState({
      layers: [{ id: 'l1', chartType: stub.type, columns: {}, axis: 'y1', options: {}, visible: true }],
      activeLayerIndex: 0,
    });
    render(<ChartArea />);
    expect(screen.getByText('Area Stub')).toBeInTheDocument();
    expect(screen.getByTestId('stub-chart')).toBeInTheDocument();
  });

  it('wires the ColumnPicker onChange up to chartStore.updateLayer', async () => {
    const { fireEvent } = await import('@testing-library/react');
    useDatasetStore.getState().addDataset(makeDS());
    useChartStore.setState({
      layers: [{ id: 'l1', chartType: stub.type, columns: {}, axis: 'y1', options: {}, visible: true }],
      activeLayerIndex: 0,
    });
    render(<ChartArea />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'v' } });
    expect(useChartStore.getState().layers[0].columns.value).toBe('v');
  });
});
