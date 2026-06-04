import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toolbar } from '@/components/toolbar/Toolbar';
import { useUIStore } from '@/stores/ui-store';
import { useDatasetStore } from '@/stores/dataset-store';

describe('Toolbar', () => {
  beforeEach(() => {
    useUIStore.setState({ theme: 'dark', sidebarOpen: true, sidebarTab: 'data', modal: 'none' });
    useDatasetStore.setState({ datasets: new Map(), activeDatasetId: null, isLoading: false, loadProgress: 0 });
  });

  it('renders the app brand + theme toggle', () => {
    render(<Toolbar />);
    expect(screen.getByText('Business Intelligence')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Switch to light mode/ })).toBeInTheDocument();
  });

  it('uses theme tokens for the upload button foreground', () => {
    render(<Toolbar />);
    expect(screen.getByRole('button', { name: /Upload/ })).toHaveStyle({ color: 'var(--bg-primary)' });
  });

  it('clicking the Upload button triggers the hidden file input', async () => {
    const user = userEvent.setup();
    render(<Toolbar />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const spy = vi.spyOn(input, 'click');
    await user.click(screen.getByRole('button', { name: /Upload/ }));
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('toggles the theme when the theme button is clicked', async () => {
    const user = userEvent.setup();
    render(<Toolbar />);
    await user.click(screen.getByRole('button', { name: /Switch to light mode/ }));
    expect(useUIStore.getState().theme).toBe('light');
  });

  it('opens the command palette from the toolbar action', async () => {
    const user = userEvent.setup();
    render(<Toolbar />);
    await user.click(screen.getByRole('button', { name: /Commands/ }));
    expect(useUIStore.getState().modal).toBe('command');
  });

  it('opens and closes the samples dropdown', async () => {
    const user = userEvent.setup();
    render(<Toolbar />);
    await user.click(screen.getByRole('button', { name: /Samples/ }));
    expect(screen.getByText(/Stock Market/)).toBeInTheDocument();
  });

  it('loads a sample dataset into the dataset store', async () => {
    const user = userEvent.setup();
    render(<Toolbar />);
    await user.click(screen.getByRole('button', { name: /Samples/ }));
    await user.click(screen.getByText(/Stock Market/));
    await waitFor(() => {
      expect(useDatasetStore.getState().activeDatasetId).not.toBeNull();
    });
  });

  it('shows an error toast when file loading throws', async () => {
    const loader = await import('@/data/loader');
    const spy = vi.spyOn(loader, 'loadFile').mockRejectedValue(new Error('nope'));
    render(<Toolbar />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['x'], 'bad.xyz');
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => {
      expect(screen.getByText('nope')).toBeInTheDocument();
    });
    spy.mockRestore();
  });

  it('dismisses the error when x is clicked', async () => {
    const loader = await import('@/data/loader');
    const spy = vi.spyOn(loader, 'loadFile').mockRejectedValue(new Error('boom'));
    render(<Toolbar />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(['x'], 'bad.xyz')] } });
    const dismiss = await screen.findByText('x');
    fireEvent.click(dismiss);
    await waitFor(() => expect(screen.queryByText('boom')).not.toBeInTheDocument());
    spy.mockRestore();
  });

  it('ignores file changes with no file', () => {
    render(<Toolbar />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [] } });
    expect(useDatasetStore.getState().isLoading).toBe(false);
  });

  it('shows an error when a sample dataset fails to load', async () => {
    const sample = await import('@/data/sample-data');
    const spy = vi.spyOn(sample, 'loadSampleData').mockImplementation(() => {
      throw new Error('sample boom');
    });
    const user = userEvent.setup();
    render(<Toolbar />);
    await user.click(screen.getByRole('button', { name: /Samples/ }));
    await user.click(screen.getByText(/Stock Market/));
    expect(screen.getByText('sample boom')).toBeInTheDocument();
    spy.mockRestore();
  });

  it('shows a generic message when the failure is not an Error instance', async () => {
    const sample = await import('@/data/sample-data');
    const spy = vi.spyOn(sample, 'loadSampleData').mockImplementation(() => {
      throw 'bare string';
    });
    const user = userEvent.setup();
    render(<Toolbar />);
    await user.click(screen.getByRole('button', { name: /Samples/ }));
    await user.click(screen.getByText(/Stock Market/));
    expect(screen.getByText('Failed to load sample')).toBeInTheDocument();
    spy.mockRestore();
  });

  it('shows a generic message when the file loader rejects with a non-Error', async () => {
    const loader = await import('@/data/loader');
    const spy = vi.spyOn(loader, 'loadFile').mockRejectedValue('not an error object');
    render(<Toolbar />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(['x'], 'bad.xyz')] } });
    await waitFor(() => {
      expect(screen.getByText('Failed to load file')).toBeInTheDocument();
    });
    spy.mockRestore();
  });

  it('loads an uploaded CSV file', async () => {
    const loader = await import('@/data/loader');
    const spy = vi.spyOn(loader, 'loadFile').mockResolvedValue({
      id: 'uploaded',
      name: 'up.csv',
      rows: [],
      columnArrays: {},
      columns: [],
      rowCount: 0,
      shape: 'generic',
      fileSize: 0,
      loadedAt: new Date(),
    });
    render(<Toolbar />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(['a,b\n1,2'], 'up.csv')] } });
    await waitFor(() => {
      expect(useDatasetStore.getState().activeDatasetId).toBe('uploaded');
    });
    spy.mockRestore();
  });
});
