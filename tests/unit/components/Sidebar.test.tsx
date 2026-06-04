import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/components/sidebar/ChartPicker', () => ({
  ChartPicker: () => <div data-testid="picker" />,
}));
vi.mock('@/components/sidebar/ChartOptionsPanel', () => ({
  ChartOptionsPanel: () => <div data-testid="options" />,
}));
vi.mock('@/lib/downloadTextFile', () => ({
  downloadTextFile: vi.fn(),
}));

import { Sidebar } from '@/components/sidebar/Sidebar';
import { useUIStore } from '@/stores/ui-store';
import { useDatasetStore } from '@/stores/dataset-store';
import { useChartStore } from '@/stores/chart-store';
import { useFilterStore } from '@/stores/filter-store';
import { useAnnotationStore } from '@/stores/annotation-store';
import type { DataSet } from '@/types/data';
import { downloadTextFile } from '@/lib/downloadTextFile';

function dataset(id: string, name: string, rows: Record<string, unknown>[] = []): DataSet {
  return {
    id,
    name,
    rows,
    columnArrays: {
      x: rows.map((row) => row.x),
      value: rows.map((row) => row.value),
    },
    columns: [
      { name: 'x', type: 'category', nullable: false, uniqueCount: 2, nullCount: 0 },
      { name: 'value', type: 'integer', nullable: false, uniqueCount: 2, nullCount: 0 },
    ],
    rowCount: rows.length,
    shape: 'category_numeric',
    fileSize: 2048,
    loadedAt: new Date(),
  };
}

describe('Sidebar', () => {
  beforeEach(() => {
    useUIStore.setState({ theme: 'dark', sidebarOpen: true, sidebarTab: 'data', modal: 'none' });
    useDatasetStore.setState({ datasets: new Map(), activeDatasetId: null, isLoading: false, loadProgress: 0 });
    useChartStore.setState({ layers: [], activeLayerIndex: 0 });
    useFilterStore.setState({ filters: [] });
    useAnnotationStore.setState({ annotations: [] });
    vi.mocked(downloadTextFile).mockClear();
  });

  it('shows the empty-state message on the Data tab when no dataset is active', () => {
    render(<Sidebar />);
    expect(screen.getByText('Upload a file to get started')).toBeInTheDocument();
  });

  it('shows dataset metadata on the Data tab when a dataset is active', () => {
    useDatasetStore.setState({
      datasets: new Map([
        ['ds1', {
          id: 'ds1', name: 'numbers.csv',
          rows: [], columnArrays: {}, columns: [
            { name: 'x', type: 'integer', nullable: false, uniqueCount: 0, nullCount: 0 },
          ],
          rowCount: 100, shape: 'generic', fileSize: 2048, loadedAt: new Date(),
        }],
      ]),
      activeDatasetId: 'ds1', isLoading: false, loadProgress: 100,
    });
    render(<Sidebar />);
    expect(screen.getByText('numbers.csv')).toBeInTheDocument();
    expect(screen.getByText('100 rows')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'x' })).toBeInTheDocument();
    expect(screen.getByText('No rows to preview')).toBeInTheDocument();
  });

  it('switches between loaded datasets and previews rows', async () => {
    const user = userEvent.setup();
    useDatasetStore.setState({
      datasets: new Map([
        ['ds1', dataset('ds1', 'first.csv', [{ x: 'A', value: 10 }])],
        ['ds2', dataset('ds2', 'second.csv', [{ x: 'B', value: 20 }])],
      ]),
      activeDatasetId: 'ds1',
      isLoading: false,
      loadProgress: 100,
    });
    render(<Sidebar />);
    expect(screen.getByRole('heading', { name: 'first.csv' })).toBeInTheDocument();
    expect(screen.getByText('A')).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Active dataset'), 'ds2');
    expect(useDatasetStore.getState().activeDatasetId).toBe('ds2');
    expect(screen.getByRole('heading', { name: 'second.csv' })).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
  });

  it('renders preview blanks and disables filters when a dataset has no columns', () => {
    useDatasetStore.setState({
      datasets: new Map([[
        'empty-columns',
        {
          id: 'empty-columns',
          name: 'empty-columns.csv',
          rows: [{}],
          columnArrays: {},
          columns: [],
          rowCount: 1,
          shape: 'generic',
          fileSize: 128,
          loadedAt: new Date(),
        },
      ]]),
      activeDatasetId: 'empty-columns',
      isLoading: false,
      loadProgress: 100,
    });
    render(<Sidebar />);
    expect(screen.getByRole('heading', { name: 'empty-columns.csv' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add filter' })).toBeDisabled();
  });

  it('renders blank cells for null preview values', () => {
    useDatasetStore.setState({
      datasets: new Map([['nullable', dataset('nullable', 'nullable.csv', [{ x: null, value: 10 }])]]),
      activeDatasetId: 'nullable',
      isLoading: false,
      loadProgress: 100,
    });
    render(<Sidebar />);
    expect(screen.getByRole('cell', { name: '' })).toBeInTheDocument();
  });

  it('adds, toggles, removes, and clears filters from the Data tab', () => {
    useDatasetStore.setState({
      datasets: new Map([['ds1', dataset('ds1', 'filterable.csv', [{ x: 'A', value: 10 }])]]),
      activeDatasetId: 'ds1',
      isLoading: false,
      loadProgress: 100,
    });
    render(<Sidebar />);
    expect(screen.getByRole('button', { name: 'Add filter' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Filter column'), { target: { value: 'value' } });
    fireEvent.change(screen.getByLabelText('Filter operator'), { target: { value: 'gt' } });
    fireEvent.change(screen.getByLabelText('Filter value'), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add filter' }));
    expect(useFilterStore.getState().filters[0]).toMatchObject({ column: 'value', op: 'gt', value: 5, active: true });

    fireEvent.click(screen.getByRole('button', { name: 'value gt 5' }));
    expect(useFilterStore.getState().filters[0].active).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'remove' }));
    expect(useFilterStore.getState().filters).toHaveLength(0);

    fireEvent.change(screen.getByLabelText('Filter column'), { target: { value: 'x' } });
    fireEvent.change(screen.getByLabelText('Filter operator'), { target: { value: 'eq' } });
    fireEvent.change(screen.getByLabelText('Filter value'), { target: { value: 'A' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add filter' }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(useFilterStore.getState().filters).toHaveLength(0);
  });

  it('shows the filtered row count in the Data tab', () => {
    useDatasetStore.setState({
      datasets: new Map([[
        'ds1',
        dataset('ds1', 'filter-count.csv', [
          { x: 'A', value: 10 },
          { x: 'B', value: 20 },
        ]),
      ]]),
      activeDatasetId: 'ds1',
      isLoading: false,
      loadProgress: 100,
    });
    render(<Sidebar />);
    expect(screen.getByText('Showing 2 of 2 rows')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Filter column'), { target: { value: 'x' } });
    fireEvent.change(screen.getByLabelText('Filter operator'), { target: { value: 'eq' } });
    fireEvent.change(screen.getByLabelText('Filter value'), { target: { value: 'A' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add filter' }));

    expect(screen.getByText('Showing 1 of 2 rows')).toBeInTheDocument();
  });

  it('keeps non-numeric values when a numeric filter operator receives text', () => {
    useDatasetStore.setState({
      datasets: new Map([['ds1', dataset('ds1', 'filterable.csv', [{ x: 'A', value: 10 }])]]),
      activeDatasetId: 'ds1',
      isLoading: false,
      loadProgress: 100,
    });
    render(<Sidebar />);
    fireEvent.change(screen.getByLabelText('Filter column'), { target: { value: 'value' } });
    fireEvent.change(screen.getByLabelText('Filter operator'), { target: { value: 'gt' } });
    fireEvent.change(screen.getByLabelText('Filter value'), { target: { value: 'abc' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add filter' }));
    expect(useFilterStore.getState().filters[0]).toMatchObject({ column: 'value', op: 'gt', value: 'abc' });
  });

  it('adds, removes, and clears active-dataset annotations from the Data tab', () => {
    useDatasetStore.setState({
      datasets: new Map([['ds1', dataset('ds1', 'annotated.csv', [{ x: 'A', value: 10 }, { x: 'B', value: 20 }])]]),
      activeDatasetId: 'ds1',
      isLoading: false,
      loadProgress: 100,
    });
    render(<Sidebar />);
    expect(screen.getByRole('button', { name: 'Add note' })).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Annotation row index'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Annotation text'), { target: { value: 'Check this row' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add note' }));
    expect(useAnnotationStore.getState().annotations[0]).toMatchObject({
      datasetId: 'ds1',
      dataPointIndex: 1,
      text: 'Check this row',
    });
    expect(screen.getByText('Row 1: Check this row')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'remove' }));
    expect(useAnnotationStore.getState().annotations).toHaveLength(0);

    fireEvent.change(screen.getByLabelText('Annotation row index'), { target: { value: '0' } });
    fireEvent.change(screen.getByLabelText('Annotation text'), { target: { value: 'Clear me' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add note' }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear annotations' }));
    expect(useAnnotationStore.getState().annotations).toHaveLength(0);
  });

  it('hides annotations from inactive datasets', () => {
    useDatasetStore.setState({
      datasets: new Map([
        ['ds1', dataset('ds1', 'active.csv', [{ x: 'A', value: 10 }])],
        ['ds2', dataset('ds2', 'other.csv', [{ x: 'B', value: 20 }])],
      ]),
      activeDatasetId: 'ds1',
      isLoading: false,
      loadProgress: 100,
    });
    useAnnotationStore.setState({
      annotations: [{ id: 'ann-1', datasetId: 'ds2', dataPointIndex: 0, text: 'Other dataset', createdAt: new Date() }],
    });
    render(<Sidebar />);
    expect(screen.queryByText('Row 0: Other dataset')).not.toBeInTheDocument();
  });

  it('exports the filtered data view and chart spec from the Data tab', () => {
    useDatasetStore.setState({
      datasets: new Map([[
        'ds1',
        dataset('ds1', 'export.csv', [
          { x: 'A', value: 10 },
          { x: 'B', value: 20 },
        ]),
      ]]),
      activeDatasetId: 'ds1',
      isLoading: false,
      loadProgress: 100,
    });
    useChartStore.setState({
      layers: [
        { id: 'l1', chartType: 'bar', columns: { category: 'x', value: 'value' }, axis: 'y1', options: { stacked: false }, visible: true },
        { id: 'l2', chartType: 'line', columns: { date: 'x', value: 'value' }, axis: 'y2', options: { smooth: true }, visible: false },
      ],
      activeLayerIndex: 0,
    });
    useFilterStore.setState({
      filters: [{ id: 'filter-1', column: 'x', op: 'eq', value: 'A', active: true }],
    });
    useAnnotationStore.setState({
      annotations: [
        { id: 'ann-1', datasetId: 'ds1', dataPointIndex: 0, text: 'Important', createdAt: new Date('2024-01-01T00:00:00Z') },
        { id: 'ann-2', datasetId: 'other', dataPointIndex: 0, text: 'Ignore', createdAt: new Date('2024-01-02T00:00:00Z') },
      ],
    });

    render(<Sidebar />);
    fireEvent.click(screen.getByRole('button', { name: 'CSV' }));
    expect(downloadTextFile).toHaveBeenLastCalledWith(
      'export-filtered.csv',
      'x,value\nA,10',
      'text/csv;charset=utf-8',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Spec' }));
    const [, specContent, mime] = vi.mocked(downloadTextFile).mock.calls.at(-1)!;
    expect(mime).toBe('application/json;charset=utf-8');
    expect(JSON.parse(specContent)).toMatchObject({
      dataset: { id: 'ds1', name: 'export.csv', rowCount: 2 },
      activeLayer: { chartType: 'bar', columns: { category: 'x', value: 'value' }, options: { stacked: false } },
      activeLayerIndex: 0,
      layers: [
        {
          id: 'l1',
          chartType: 'bar',
          columns: { category: 'x', value: 'value' },
          axis: 'y1',
          options: { stacked: false },
          visible: true,
        },
        {
          id: 'l2',
          chartType: 'line',
          columns: { date: 'x', value: 'value' },
          axis: 'y2',
          options: { smooth: true },
          visible: false,
        },
      ],
      filters: [{ id: 'filter-1', column: 'x', op: 'eq', value: 'A', active: true }],
      annotations: [{ id: 'ann-1', datasetId: 'ds1', dataPointIndex: 0, text: 'Important', createdAt: '2024-01-01T00:00:00.000Z' }],
    });
  });

  it('swaps to the Charts tab and renders the picker', async () => {
    const user = userEvent.setup();
    render(<Sidebar />);
    await user.click(screen.getByRole('button', { name: 'Charts' }));
    expect(screen.getByTestId('picker')).toBeInTheDocument();
  });

  it('Layers tab - empty state with no layers', async () => {
    const user = userEvent.setup();
    render(<Sidebar />);
    await user.click(screen.getByRole('button', { name: 'Layers' }));
    expect(screen.getByText('Pick a chart type to add a layer')).toBeInTheDocument();
  });

  it('Layers tab - lists active layers and removes on click', async () => {
    useChartStore.setState({
      layers: [
        { id: 'l1', chartType: 'histogram', columns: {}, axis: 'y1', options: {}, visible: true },
      ],
      activeLayerIndex: 0,
    });
    const user = userEvent.setup();
    render(<Sidebar />);
    await user.click(screen.getByRole('button', { name: 'Layers' }));
    expect(screen.getByText('histogram')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'remove' }));
    expect(useChartStore.getState().layers).toHaveLength(0);
  });

  it('Layers tab - clicking a layer activates it', async () => {
    useChartStore.setState({
      layers: [
        { id: 'l1', chartType: 'histogram', columns: {}, axis: 'y1', options: {}, visible: true },
        { id: 'l2', chartType: 'line', columns: {}, axis: 'y1', options: {}, visible: true },
      ],
      activeLayerIndex: 0,
    });
    const user = userEvent.setup();
    render(<Sidebar />);
    await user.click(screen.getByRole('button', { name: 'Layers' }));
    await user.click(screen.getByRole('button', { name: 'line' }));
    expect(useChartStore.getState().activeLayerIndex).toBe(1);
  });

  it('Layers tab - toggles layer visibility', async () => {
    useChartStore.setState({
      layers: [
        { id: 'l1', chartType: 'histogram', columns: {}, axis: 'y1', options: {}, visible: true },
      ],
      activeLayerIndex: 0,
    });
    const user = userEvent.setup();
    render(<Sidebar />);
    await user.click(screen.getByRole('button', { name: 'Layers' }));
    await user.click(screen.getByRole('button', { name: 'Hide histogram' }));
    expect(useChartStore.getState().layers[0].visible).toBe(false);
    await user.click(screen.getByRole('button', { name: 'Show histogram' }));
    expect(useChartStore.getState().layers[0].visible).toBe(true);
  });

  it('Style tab renders the options panel', async () => {
    const user = userEvent.setup();
    render(<Sidebar />);
    await user.click(screen.getByRole('button', { name: 'Style' }));
    expect(screen.getByTestId('options')).toBeInTheDocument();
  });
});
