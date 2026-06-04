import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from '@/stores/ui-store';

describe('useUIStore', () => {
  beforeEach(() => {
    useUIStore.setState({
      theme: 'dark',
      sidebarOpen: true,
      sidebarTab: 'data',
      modal: 'none',
    });
  });

  it('toggles theme between dark and light', () => {
    useUIStore.getState().toggleTheme();
    expect(useUIStore.getState().theme).toBe('light');
    useUIStore.getState().toggleTheme();
    expect(useUIStore.getState().theme).toBe('dark');
  });

  it('sets the theme explicitly', () => {
    useUIStore.getState().setTheme('light');
    expect(useUIStore.getState().theme).toBe('light');
  });

  it('switches the sidebar tab', () => {
    useUIStore.getState().setSidebarTab('charts');
    expect(useUIStore.getState().sidebarTab).toBe('charts');
    useUIStore.getState().setSidebarTab('layers');
    expect(useUIStore.getState().sidebarTab).toBe('layers');
  });

  it('opens and closes modals', () => {
    useUIStore.getState().openModal('export');
    expect(useUIStore.getState().modal).toBe('export');
    useUIStore.getState().openModal('command');
    expect(useUIStore.getState().modal).toBe('command');
    useUIStore.getState().closeModal();
    expect(useUIStore.getState().modal).toBe('none');
  });
});
