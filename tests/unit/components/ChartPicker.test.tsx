import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChartPicker } from '@/components/sidebar/ChartPicker';
import { chartRegistry } from '@/charts/registry';
import { useChartStore } from '@/stores/chart-store';
import type { ChartDefinition } from '@/charts/types';

function ensureStub(type: string, family: ChartDefinition['family']): void {
  if (chartRegistry.get(type)) return;
  chartRegistry.register({
    type, family, name: type, description: '', renderer: 'echarts',
    compatibleShapes: ['generic'], requiredColumns: [],
    createRenderer: () => ({ render: () => null as never }),
  });
}

describe('ChartPicker', () => {
  beforeEach(() => {
    useChartStore.setState({ layers: [], activeLayerIndex: 0 });
    ensureStub('__picker_a__', 'distribution');
    ensureStub('__picker_b__', 'composition');
  });

  it('renders an "All families" option + the existing registered families', () => {
    render(<ChartPicker />);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByText(/All families/)).toBeInTheDocument();
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
