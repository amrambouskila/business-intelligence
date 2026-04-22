import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/components/sidebar/ChartPicker', () => ({
  ChartPicker: () => <div data-testid="picker" />,
}));
vi.mock('@/components/sidebar/ChartOptionsPanel', () => ({
  ChartOptionsPanel: () => <div data-testid="options" />,
}));

import { Sidebar } from '@/components/sidebar/Sidebar';
import { useUIStore } from '@/stores/ui-store';
import { useDatasetStore } from '@/stores/dataset-store';
import { useChartStore } from '@/stores/chart-store';

describe('Sidebar', () => {
  beforeEach(() => {
    useUIStore.setState({ theme: 'dark', sidebarOpen: true, sidebarTab: 'data', modal: 'none' });
    useDatasetStore.setState({ datasets: new Map(), activeDatasetId: null, isLoading: false, loadProgress: 0 });
    useChartStore.setState({ layers: [], activeLayerIndex: 0 });
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
    expect(screen.getByText('x')).toBeInTheDocument();
  });

  it('swaps to the Charts tab and renders the picker', async () => {
    const user = userEvent.setup();
    render(<Sidebar />);
    await user.click(screen.getByRole('button', { name: 'Charts' }));
    expect(screen.getByTestId('picker')).toBeInTheDocument();
  });

  it('Layers tab — empty state with no layers', async () => {
    const user = userEvent.setup();
    render(<Sidebar />);
    await user.click(screen.getByRole('button', { name: 'Layers' }));
    expect(screen.getByText('Pick a chart type to add a layer')).toBeInTheDocument();
  });

  it('Layers tab — lists active layers and removes on click', async () => {
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

  it('Style tab renders the options panel', async () => {
    const user = userEvent.setup();
    render(<Sidebar />);
    await user.click(screen.getByRole('button', { name: 'Style' }));
    expect(screen.getByTestId('options')).toBeInTheDocument();
  });
});
