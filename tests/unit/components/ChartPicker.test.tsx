import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChartPicker } from '@/components/sidebar/ChartPicker';
import { chartRegistry } from '@/charts/registry';
import { useChartStore } from '@/stores/chart-store';
import { useDatasetStore } from '@/stores/dataset-store';
import type { ChartDefinition, ColumnRole } from '@/charts/types';
import type { ColumnMeta, DataSet, DataShape } from '@/types/data';

function ensureStub(type: string, family: ChartDefinition['family'], shapes: DataShape[] = ['generic'], required: ColumnRole[] = []): void {
  if (chartRegistry.get(type)) return;
  chartRegistry.register({
    type, family, name: type, description: '', renderer: 'echarts',
    compatibleShapes: shapes, requiredColumns: required,
    createRenderer: () => ({ render: () => null as never }),
  });
}

function intCol(name: string): ColumnMeta {
  return { name, type: 'integer', nullable: false, uniqueCount: 3, nullCount: 0 };
}

function dsWith(shape: DataShape, columns: ColumnMeta[], id = 'd1'): DataSet {
  return { id, name: 't.csv', rows: [{}], columnArrays: {}, columns, rowCount: 3, shape, fileSize: 0, loadedAt: new Date() };
}

describe('ChartPicker', () => {
  beforeEach(() => {
    useChartStore.setState({ layers: [], activeLayerIndex: 0 });
    useDatasetStore.setState({ datasets: new Map(), activeDatasetId: null, isLoading: false, loadProgress: 0 });
    ensureStub('__picker_a__', 'distribution');
    ensureStub('__picker_b__', 'composition');
    ensureStub('__picker_two__', 'relationships', ['two_numeric'], [{ role: 'x', acceptedTypes: ['integer'], label: 'X' }]);
  });

  it('renders an "All families" option + the existing registered families', () => {
    render(<ChartPicker />);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByText(/All families/)).toBeInTheDocument();
  });

  it('shows ranked, shape-aware suggestions when a dataset is active', () => {
    useDatasetStore.getState().addDataset(dsWith('two_numeric', [intCol('x')]));
    render(<ChartPicker />);
    expect(screen.getByText(/Suggested for two numeric data/)).toBeInTheDocument();
    expect(screen.getByText('__picker_two__')).toBeInTheDocument();
    // generic-only charts are not compatible with two_numeric, so not suggested
    expect(screen.queryByText('__picker_a__')).not.toBeInTheDocument();
    // suggested view has no family combobox
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('toggles to the full catalog via "Show all charts" and back to suggestions', () => {
    useDatasetStore.getState().addDataset(dsWith('two_numeric', [intCol('x')]));
    render(<ChartPicker />);
    fireEvent.click(screen.getByText(/Show all charts/));
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    fireEvent.click(screen.getByText(/Back to suggestions/));
    expect(screen.getByText(/Suggested for/)).toBeInTheDocument();
  });

  it('adds a layer from a suggestion', async () => {
    useDatasetStore.getState().addDataset(dsWith('two_numeric', [intCol('x')]));
    const user = userEvent.setup();
    render(<ChartPicker />);
    await user.click(screen.getByText('__picker_two__'));
    expect(useChartStore.getState().layers.map((l) => l.chartType)).toContain('__picker_two__');
  });

  it('falls back to the catalog when the active shape has no compatible charts', () => {
    useDatasetStore.getState().addDataset(dsWith('geo_polygons', [intCol('x')]));
    render(<ChartPicker />);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.queryByText(/Suggested for/)).not.toBeInTheDocument();
  });

  it('renders suggestions in score order — specialist before generalist', () => {
    ensureStub('__picker_two_gen__', 'relationships', ['two_numeric', 'generic', 'many_numeric'], [{ role: 'x', acceptedTypes: ['integer'], label: 'X' }]);
    useDatasetStore.getState().addDataset(dsWith('two_numeric', [intCol('x'), intCol('y')]));
    render(<ChartPicker />);
    const labels = screen.getAllByRole('button').map((b) => b.textContent ?? '');
    const specialist = labels.findIndex((t) => t.startsWith('__picker_two__'));
    const generalist = labels.findIndex((t) => t.startsWith('__picker_two_gen__'));
    expect(specialist).toBeGreaterThanOrEqual(0);
    expect(generalist).toBeGreaterThanOrEqual(0);
    expect(specialist).toBeLessThan(generalist);
  });

  it('returns to suggestions when a different dataset is loaded after "Show all"', () => {
    useDatasetStore.getState().addDataset(dsWith('two_numeric', [intCol('x')], 'dA'));
    render(<ChartPicker />);
    fireEvent.click(screen.getByText(/Show all charts/));
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    act(() => {
      useDatasetStore.getState().addDataset(dsWith('two_numeric', [intCol('x')], 'dB'));
    });
    expect(screen.getByText(/Suggested for/)).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('filters the chart list when a family is selected', async () => {
    render(<ChartPicker />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'distribution' } });
    expect(screen.getByText('__picker_a__')).toBeInTheDocument();
    expect(screen.queryByText('__picker_b__')).not.toBeInTheDocument();
  });

  it('adds a layer when a chart button is clicked', async () => {
    const user = userEvent.setup();
    render(<ChartPicker />);
    await user.click(screen.getByText('__picker_a__'));
    expect(useChartStore.getState().layers.map((l) => l.chartType)).toContain('__picker_a__');
  });

  it('re-selecting "All families" clears the filter', async () => {
    render(<ChartPicker />);
    const combo = screen.getByRole('combobox');
    fireEvent.change(combo, { target: { value: 'distribution' } });
    fireEvent.change(combo, { target: { value: '' } });
    // Both stub charts from both families should be visible again.
    expect(screen.getByText('__picker_a__')).toBeInTheDocument();
    expect(screen.getByText('__picker_b__')).toBeInTheDocument();
  });

  it('falls back to the raw family key when FAMILY_META has no entry for it', () => {
    const familiesSpy = vi.spyOn(chartRegistry, 'families').mockReturnValue(['__not_in_meta__' as 'distribution']);
    const byFamilySpy = vi.spyOn(chartRegistry, 'getByFamily').mockReturnValue([]);
    try {
      render(<ChartPicker />);
      expect(screen.getByText(/__not_in_meta__/)).toBeInTheDocument();
    } finally {
      familiesSpy.mockRestore();
      byFamilySpy.mockRestore();
    }
  });

  it('shows an empty-state message when the selected family has no registered charts', () => {
    const familiesSpy = vi.spyOn(chartRegistry, 'families').mockReturnValue(['3d']);
    const byFamilySpy = vi.spyOn(chartRegistry, 'getByFamily').mockReturnValue([]);
    try {
      render(<ChartPicker />);
      fireEvent.change(screen.getByRole('combobox'), { target: { value: '3d' } });
      expect(screen.getByText('No charts registered yet')).toBeInTheDocument();
    } finally {
      familiesSpy.mockRestore();
      byFamilySpy.mockRestore();
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });
});
