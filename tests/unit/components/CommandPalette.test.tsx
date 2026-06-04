import { describe, expect, it, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommandPalette } from '@/components/ui/CommandPalette';
import { useDatasetStore } from '@/stores/dataset-store';
import { useUIStore } from '@/stores/ui-store';

describe('CommandPalette', () => {
  beforeEach(() => {
    useUIStore.setState({ theme: 'dark', sidebarOpen: true, sidebarTab: 'data', modal: 'none' });
    useDatasetStore.setState({ datasets: new Map(), activeDatasetId: null, isLoading: false, loadProgress: 0 });
  });

  it('renders nothing until opened', () => {
    const { container } = render(<CommandPalette />);
    expect(container).toBeEmptyDOMElement();
  });

  it('opens with Ctrl+K and closes with Escape', () => {
    render(<CommandPalette />);
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    expect(screen.getByRole('dialog', { name: 'Command palette' })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Command palette' })).not.toBeInTheDocument();
  });

  it('opens with Meta+K and closes when the backdrop is clicked', () => {
    render(<CommandPalette />);
    fireEvent.keyDown(window, { key: 'K', metaKey: true });
    const dialog = screen.getByRole('dialog', { name: 'Command palette' });
    fireEvent.mouseDown(dialog.parentElement!);
    expect(screen.queryByRole('dialog', { name: 'Command palette' })).not.toBeInTheDocument();
  });

  it('switches sidebar tabs from a command', async () => {
    const user = userEvent.setup();
    useUIStore.getState().openModal('command');
    render(<CommandPalette />);
    await user.click(screen.getByRole('button', { name: 'Show Charts' }));
    expect(useUIStore.getState().sidebarTab).toBe('charts');
    expect(useUIStore.getState().modal).toBe('none');
  });

  it('toggles the theme from a command', async () => {
    const user = userEvent.setup();
    useUIStore.getState().openModal('command');
    render(<CommandPalette />);
    await user.click(screen.getByRole('button', { name: 'Switch to light mode' }));
    expect(useUIStore.getState().theme).toBe('light');
    expect(useUIStore.getState().modal).toBe('none');
  });

  it('loads a sample dataset from a command', async () => {
    const user = userEvent.setup();
    useUIStore.getState().openModal('command');
    render(<CommandPalette />);
    await user.click(screen.getByRole('button', { name: /Load Stock Market/ }));
    expect(useDatasetStore.getState().activeDatasetId).not.toBeNull();
    expect(useUIStore.getState().modal).toBe('none');
  });

  it('filters commands and shows an empty state for no matches', async () => {
    const user = userEvent.setup();
    useUIStore.getState().openModal('command');
    render(<CommandPalette />);
    await user.type(screen.getByLabelText('Search commands'), 'style');
    expect(screen.getByRole('button', { name: 'Show Style' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Show Data' })).not.toBeInTheDocument();
    await user.clear(screen.getByLabelText('Search commands'));
    await user.type(screen.getByLabelText('Search commands'), 'zzzz');
    expect(screen.getByText('No commands found')).toBeInTheDocument();
  });
});
