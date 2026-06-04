import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('echarts-for-react', () => ({
  default: () => <div data-testid="mock-echarts" />,
}));

import { ChartArea } from '@/components/chart-area/ChartArea';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { useChartStore } from '@/stores/chart-store';
import { useDatasetStore } from '@/stores/dataset-store';
import { useFilterStore } from '@/stores/filter-store';
import { chartRegistry } from '@/charts/registry';
import { downloadChartPNG, downloadChartSVG } from '@/charts/export-image';
import type { ChartDefinition } from '@/charts/types';
import type { DataSet } from '@/types/data';

vi.mock('@/charts/export-image', () => ({
  downloadChartPNG: vi.fn(),
  downloadChartSVG: vi.fn(),
}));

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

const twoRole: ChartDefinition = {
  type: '__two_role__', family: 'distribution', name: 'Two Role', description: '', renderer: 'echarts',
  compatibleShapes: ['generic'],
  requiredColumns: [
    { role: 'x', acceptedTypes: ['integer'], label: 'X' },
    { role: 'y', acceptedTypes: ['integer'], label: 'Y' },
  ],
  createRenderer: () => ({ render: () => <div data-testid="stub-chart" /> }),
};

const floatRole: ChartDefinition = {
  type: '__float_role__', family: 'distribution', name: 'Float Role', description: '', renderer: 'echarts',
  compatibleShapes: ['generic'],
  requiredColumns: [{ role: 'value', acceptedTypes: ['float'], label: 'Value' }],
  createRenderer: () => ({ render: () => <div data-testid="stub-chart" /> }),
};

const optionalRole: ChartDefinition = {
  type: '__optional_role__',
  family: 'distribution',
  name: 'Optional Role',
  description: '',
  renderer: 'echarts',
  compatibleShapes: ['generic'],
  requiredColumns: [{ role: 'value', acceptedTypes: ['integer'], label: 'Value' }],
  optionalColumns: [{ role: 'group', acceptedTypes: ['category'], label: 'Group' }],
  createRenderer: () => ({ render: () => <div data-testid="stub-chart" /> }),
};

const eventAliasRole: ChartDefinition = {
  type: '__event_alias_role__',
  family: 'time-series',
  name: 'Event Alias Role',
  description: '',
  renderer: 'echarts',
  compatibleShapes: ['event_log'],
  requiredColumns: [
    { role: 'date', acceptedTypes: ['datetime', 'date', 'category', 'text'], label: 'Date' },
    { role: 'label', acceptedTypes: ['category', 'text'], label: 'Label' },
  ],
  createRenderer: () => ({ render: () => <div data-testid="stub-chart" /> }),
};

const rowCountStub: ChartDefinition = {
  type: '__row_count_stub__',
  family: 'distribution',
  name: 'Row Count Stub',
  description: '',
  renderer: 'echarts',
  compatibleShapes: ['generic'],
  requiredColumns: [{ role: 'value', acceptedTypes: ['integer'], label: 'Value' }],
  createRenderer: () => ({
    render: (data) => <div data-testid="row-count">{data.rowCount}</div>,
  }),
};

const imageExportStub: ChartDefinition = {
  type: '__image_export_stub__',
  family: 'distribution',
  name: 'Image Export Stub',
  description: '',
  renderer: 'echarts',
  compatibleShapes: ['generic'],
  requiredColumns: [{ role: 'value', acceptedTypes: ['integer'], label: 'Value' }],
  createRenderer: () => ({
    render: () => <canvas data-testid="chart-canvas" width={20} height={10} />,
  }),
};

const svgExportStub: ChartDefinition = {
  type: '__svg_export_stub__',
  family: 'distribution',
  name: 'SVG Export Stub',
  description: '',
  renderer: 'echarts',
  compatibleShapes: ['generic'],
  requiredColumns: [{ role: 'value', acceptedTypes: ['integer'], label: 'Value' }],
  createRenderer: () => ({
    render: () => <svg data-testid="chart-svg" viewBox="0 0 10 10" />,
  }),
};

function dsWith(
  columns: DataSet['columns'],
  columnArrays: DataSet['columnArrays'],
  rows: DataSet['rows'] = [{}],
): DataSet {
  return {
    id: 'd1', name: 'test.csv', rows, columnArrays, columns,
    rowCount: rows.length, shape: 'generic', fileSize: 0, loadedAt: new Date(),
  };
}

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
    vi.mocked(downloadChartPNG).mockReset();
    vi.mocked(downloadChartSVG).mockReset();
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

  it('renders every visible fillable layer in the chart area', () => {
    if (!chartRegistry.get(rowCountStub.type)) chartRegistry.register(rowCountStub);
    useDatasetStore.getState().addDataset(makeDS());
    useChartStore.setState({
      layers: [
        { id: 'l1', chartType: stub.type, columns: {}, axis: 'y1', options: {}, visible: true },
        { id: 'l2', chartType: rowCountStub.type, columns: {}, axis: 'y1', options: {}, visible: true },
      ],
      activeLayerIndex: 0,
    });
    render(<ChartArea />);
    expect(screen.getByTestId('chart-render')).toHaveAttribute('data-chart-layer-count', '2');
    expect(screen.getAllByTestId('chart-layer')).toHaveLength(2);
    expect(screen.getByTestId('stub-chart')).toBeInTheDocument();
    expect(screen.getByTestId('row-count').textContent).toBe('3');
  });

  it('excludes hidden inactive layers from the composed chart area', () => {
    if (!chartRegistry.get(rowCountStub.type)) chartRegistry.register(rowCountStub);
    useDatasetStore.getState().addDataset(makeDS());
    useChartStore.setState({
      layers: [
        { id: 'l1', chartType: stub.type, columns: {}, axis: 'y1', options: {}, visible: true },
        { id: 'l2', chartType: rowCountStub.type, columns: {}, axis: 'y1', options: {}, visible: false },
      ],
      activeLayerIndex: 0,
    });
    render(<ChartArea />);
    expect(screen.getByTestId('chart-render')).toHaveAttribute('data-chart-layer-count', '1');
    expect(screen.getAllByTestId('chart-layer')).toHaveLength(1);
    expect(screen.getByTestId('stub-chart')).toBeInTheDocument();
    expect(screen.queryByTestId('row-count')).toBeNull();
  });

  it('skips stale inactive layers with unknown chart types', () => {
    useDatasetStore.getState().addDataset(makeDS());
    useChartStore.setState({
      layers: [
        { id: 'l1', chartType: stub.type, columns: {}, axis: 'y1', options: {}, visible: true },
        { id: 'stale', chartType: 'missing-chart', columns: {}, axis: 'y1', options: {}, visible: true },
      ],
      activeLayerIndex: 0,
    });
    render(<ChartArea />);
    expect(screen.getByTestId('chart-render')).toHaveAttribute('data-chart-layer-count', '1');
    expect(screen.getAllByTestId('chart-layer')).toHaveLength(1);
    expect(screen.getByTestId('stub-chart')).toBeInTheDocument();
  });

  it('does not render the active chart when the layer is hidden', () => {
    useDatasetStore.getState().addDataset(makeDS());
    useChartStore.setState({
      layers: [{ id: 'l1', chartType: stub.type, columns: {}, axis: 'y1', options: {}, visible: false }],
      activeLayerIndex: 0,
    });
    render(<ChartArea />);
    expect(screen.getByText('Area Stub')).toBeInTheDocument();
    expect(screen.getByText('Active layer is hidden')).toBeInTheDocument();
    expect(screen.getByTestId('chart-render')).toHaveAttribute('data-chart-hidden', 'true');
    expect(screen.queryByTestId('stub-chart')).toBeNull();
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

  it('prefers a column named like the role when auto-assigning', () => {
    useDatasetStore.getState().addDataset(dsWith(
      [
        { name: 'other', type: 'integer', nullable: false, uniqueCount: 3, nullCount: 0 },
        { name: 'value', type: 'integer', nullable: false, uniqueCount: 3, nullCount: 0 },
      ],
      { other: [1, 2, 3], value: [4, 5, 6] },
    ));
    useChartStore.setState({
      layers: [{ id: 'l1', chartType: stub.type, columns: {}, axis: 'y1', options: {}, visible: true }],
      activeLayerIndex: 0,
    });
    render(<ChartArea />);
    expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('value');
  });

  it('uses role-name aliases when auto-assigning event-log columns', () => {
    if (!chartRegistry.get(eventAliasRole.type)) chartRegistry.register(eventAliasRole);
    useDatasetStore.getState().addDataset(dsWith(
      [
        { name: 'user', type: 'category', nullable: false, uniqueCount: 2, nullCount: 0 },
        { name: 'event', type: 'category', nullable: false, uniqueCount: 2, nullCount: 0 },
        { name: 'timestamp', type: 'datetime', nullable: false, uniqueCount: 2, nullCount: 0 },
      ],
      {
        user: ['u1', 'u2'],
        event: ['visit', 'signup'],
        timestamp: ['2026-01-01', '2026-01-02'],
      },
      [
        { user: 'u1', event: 'visit', timestamp: '2026-01-01' },
        { user: 'u2', event: 'signup', timestamp: '2026-01-02' },
      ],
    ));
    useChartStore.setState({
      layers: [{ id: 'l1', chartType: eventAliasRole.type, columns: {}, axis: 'y1', options: {}, visible: true }],
      activeLayerIndex: 0,
    });
    render(<ChartArea />);
    const [date, label] = screen.getAllByRole('combobox') as HTMLSelectElement[];
    expect(date.value).toBe('timestamp');
    expect(label.value).toBe('event');
  });

  it('never auto-assigns the same column to two roles (consume-on-assign)', () => {
    if (!chartRegistry.get(twoRole.type)) chartRegistry.register(twoRole);
    useDatasetStore.getState().addDataset(dsWith(
      [
        { name: 'a', type: 'integer', nullable: false, uniqueCount: 3, nullCount: 0 },
        { name: 'b', type: 'integer', nullable: false, uniqueCount: 3, nullCount: 0 },
      ],
      { a: [1, 2, 3], b: [4, 5, 6] },
    ));
    useChartStore.setState({
      layers: [{ id: 'l1', chartType: twoRole.type, columns: {}, axis: 'y1', options: {}, visible: true }],
      activeLayerIndex: 0,
    });
    render(<ChartArea />);
    const [sx, sy] = screen.getAllByRole('combobox') as HTMLSelectElement[];
    expect(sx.value).toBe('a');
    expect(sy.value).toBe('b');
  });

  it('shows a no-compatible-column message when a required role cannot be filled', () => {
    if (!chartRegistry.get(floatRole.type)) chartRegistry.register(floatRole);
    useDatasetStore.getState().addDataset(dsWith(
      [{ name: 'label', type: 'category', nullable: false, uniqueCount: 3, nullCount: 0 }],
      { label: ['a', 'b', 'c'] },
    ));
    useChartStore.setState({
      layers: [{ id: 'l1', chartType: floatRole.type, columns: {}, axis: 'y1', options: {}, visible: true }],
      activeLayerIndex: 0,
    });
    render(<ChartArea />);
    expect(screen.getByText(/No compatible column for: Value/)).toBeInTheDocument();
    expect(screen.queryByTestId('stub-chart')).toBeNull();
  });

  it('renders optional column pickers and persists optional assignments', async () => {
    const { fireEvent } = await import('@testing-library/react');
    if (!chartRegistry.get(optionalRole.type)) chartRegistry.register(optionalRole);
    useDatasetStore.getState().addDataset(dsWith(
      [
        { name: 'value', type: 'integer', nullable: false, uniqueCount: 3, nullCount: 0 },
        { name: 'segment', type: 'category', nullable: false, uniqueCount: 2, nullCount: 0 },
      ],
      { value: [1, 2, 3], segment: ['A', 'B', 'A'] },
      [{ value: 1, segment: 'A' }, { value: 2, segment: 'B' }, { value: 3, segment: 'A' }],
    ));
    useChartStore.setState({
      layers: [{ id: 'l1', chartType: optionalRole.type, columns: {}, axis: 'y1', options: {}, visible: true }],
      activeLayerIndex: 0,
    });
    render(<ChartArea />);
    const [, groupPicker] = screen.getAllByRole('combobox') as HTMLSelectElement[];
    fireEvent.change(groupPicker, { target: { value: 'segment' } });
    expect(useChartStore.getState().layers[0].columns.group).toBe('segment');
    fireEvent.change(groupPicker, { target: { value: '' } });
    expect(useChartStore.getState().layers[0].columns.group).toBeUndefined();
  });

  it('applies filters created from the Data tab before rendering the chart', async () => {
    const user = (await import('@testing-library/user-event')).default.setup();
    if (!chartRegistry.get(rowCountStub.type)) chartRegistry.register(rowCountStub);
    useDatasetStore.getState().addDataset(dsWith(
      [{ name: 'value', type: 'integer', nullable: false, uniqueCount: 3, nullCount: 0 }],
      { value: [1, 2, 3] },
      [{ value: 1 }, { value: 2 }, { value: 3 }],
    ));
    useChartStore.setState({
      layers: [{ id: 'l1', chartType: rowCountStub.type, columns: {}, axis: 'y1', options: {}, visible: true }],
      activeLayerIndex: 0,
    });
    render(
      <div>
        <Sidebar />
        <ChartArea />
      </div>,
    );
    expect(screen.getByTestId('row-count').textContent).toBe('3');
    await user.selectOptions(screen.getByLabelText('Filter column'), 'value');
    await user.selectOptions(screen.getByLabelText('Filter operator'), 'gt');
    await user.type(screen.getByLabelText('Filter value'), '1');
    await user.click(screen.getByRole('button', { name: 'Add filter' }));
    expect(screen.getByTestId('row-count').textContent).toBe('2');
  });

  it('exports the active chart root as a PNG from the header action', async () => {
    const user = (await import('@testing-library/user-event')).default.setup();
    if (!chartRegistry.get(imageExportStub.type)) chartRegistry.register(imageExportStub);
    useDatasetStore.getState().addDataset(makeDS());
    useChartStore.setState({
      layers: [{ id: 'l1', chartType: imageExportStub.type, columns: {}, axis: 'y1', options: {}, visible: true }],
      activeLayerIndex: 0,
    });

    render(<ChartArea />);
    await user.click(screen.getByRole('button', { name: 'Export chart PNG' }));

    const [root, filename] = vi.mocked(downloadChartPNG).mock.calls[0];
    expect(root).toBe(screen.getByTestId('chart-render'));
    expect(filename).toBe('test-__image_export_stub__-chart.png');
  });

  it('exports the active chart root as an SVG from the header action', async () => {
    const user = (await import('@testing-library/user-event')).default.setup();
    if (!chartRegistry.get(svgExportStub.type)) chartRegistry.register(svgExportStub);
    useDatasetStore.getState().addDataset(makeDS());
    useChartStore.setState({
      layers: [{ id: 'l1', chartType: svgExportStub.type, columns: {}, axis: 'y1', options: {}, visible: true }],
      activeLayerIndex: 0,
    });

    render(<ChartArea />);
    await user.click(screen.getByRole('button', { name: 'Export chart SVG' }));

    const [root, filename] = vi.mocked(downloadChartSVG).mock.calls[0];
    expect(root).toBe(screen.getByTestId('chart-render'));
    expect(filename).toBe('test-__svg_export_stub__-chart.svg');
  });
});
