import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChartOptionsPanel } from '@/components/sidebar/ChartOptionsPanel';
import { chartRegistry } from '@/charts/registry';
import { useChartStore } from '@/stores/chart-store';
import type { ChartDefinition } from '@/charts/types';

function ensure(def: ChartDefinition): void {
  if (!chartRegistry.get(def.type)) chartRegistry.register(def);
}

const allControls: ChartDefinition = {
  type: '__opt_all__', family: 'distribution', name: 'All Controls', description: '', renderer: 'echarts',
  compatibleShapes: ['generic'], requiredColumns: [],
  options: [
    { key: 'bins', label: 'Bins', control: 'number', default: 30, min: 5, max: 200, step: 5 },
    { key: 'smooth', label: 'Smooth', control: 'toggle', default: false },
    { key: 'mode', label: 'Mode', control: 'select', default: 'a', choices: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }] },
    { key: 'tint', label: 'Tint', control: 'color', default: '#112233' },
  ],
  createRenderer: () => ({ render: () => null as never }),
};

const noOptions: ChartDefinition = {
  type: '__opt_none__', family: 'distribution', name: 'No Options', description: '', renderer: 'echarts',
  compatibleShapes: ['generic'], requiredColumns: [],
  createRenderer: () => ({ render: () => null as never }),
};

// number without min/max/step and select without choices — exercises the control defaults
const bareControls: ChartDefinition = {
  type: '__opt_bare__', family: 'distribution', name: 'Bare', description: '', renderer: 'echarts',
  compatibleShapes: ['generic'], requiredColumns: [],
  options: [
    { key: 'n', label: 'N', control: 'number', default: 5 },
    { key: 's', label: 'S', control: 'select', default: 'x' },
  ],
  createRenderer: () => ({ render: () => null as never }),
};

function setLayer(chartType: string, options: Record<string, unknown> = {}): void {
  useChartStore.setState({
    layers: [{ id: 'l1', chartType, columns: {}, axis: 'y1', options, visible: true }],
    activeLayerIndex: 0,
  });
}

describe('ChartOptionsPanel', () => {
  beforeEach(() => {
    useChartStore.setState({ layers: [], activeLayerIndex: 0 });
    ensure(allControls);
    ensure(noOptions);
    ensure(bareControls);
  });

  it('shows an empty message when no layer exists', () => {
    render(<ChartOptionsPanel />);
    expect(screen.getByText('Add a chart layer to configure options')).toBeInTheDocument();
  });

  it('returns null for an unknown chart type', () => {
    setLayer('__not_in_registry__');
    const { container } = render(<ChartOptionsPanel />);
    expect(container.firstChild).toBeNull();
  });

  it('shows a message when the chart declares no options', () => {
    setLayer('__opt_none__');
    render(<ChartOptionsPanel />);
    expect(screen.getByText('No options for this chart')).toBeInTheDocument();
  });

  it('renders every declared control generically', () => {
    setLayer('__opt_all__');
    render(<ChartOptionsPanel />);
    expect(screen.getByText('Bins')).toBeInTheDocument();
    expect(screen.getByText('Smooth')).toBeInTheDocument();
    expect(screen.getByText('Mode')).toBeInTheDocument();
    expect(screen.getByText('Tint')).toBeInTheDocument();
  });

  it('updates a number option via its slider', () => {
    setLayer('__opt_all__', { bins: 30 });
    render(<ChartOptionsPanel />);
    fireEvent.change(screen.getByRole('slider'), { target: { value: '50' } });
    expect(useChartStore.getState().layers[0].options.bins).toBe(50);
  });

  it('updates a toggle option via its checkbox', () => {
    setLayer('__opt_all__');
    render(<ChartOptionsPanel />);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(useChartStore.getState().layers[0].options.smooth).toBe(true);
  });

  it('updates a select option', () => {
    setLayer('__opt_all__');
    render(<ChartOptionsPanel />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'b' } });
    expect(useChartStore.getState().layers[0].options.mode).toBe('b');
  });

  it('updates a color option', () => {
    setLayer('__opt_all__');
    render(<ChartOptionsPanel />);
    fireEvent.change(screen.getByLabelText('Tint'), { target: { value: '#abcdef' } });
    expect(useChartStore.getState().layers[0].options.tint).toBe('#abcdef');
  });

  it('renders controls that omit optional bounds/choices using sensible defaults', () => {
    setLayer('__opt_bare__');
    render(<ChartOptionsPanel />);
    expect(screen.getByText('N')).toBeInTheDocument();
    expect(screen.getByText('S')).toBeInTheDocument();
    expect(screen.getByRole('slider')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });
});
