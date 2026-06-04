import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

export type SidebarTab = 'data' | 'charts' | 'layers' | 'style';
export type ModalType = 'none' | 'export' | 'settings' | 'filter' | 'command';

interface UIState {
  theme: 'dark' | 'light';
  sidebarOpen: boolean;
  sidebarTab: SidebarTab;
  modal: ModalType;
  setTheme: (theme: 'dark' | 'light') => void;
  toggleTheme: () => void;
  setSidebarTab: (tab: SidebarTab) => void;
  openModal: (m: ModalType) => void;
  closeModal: () => void;
}

export const useUIStore = create<UIState>()(
  immer((set) => ({
  theme: 'dark',
  sidebarOpen: true,
  sidebarTab: 'data',
  modal: 'none',
  setTheme: (theme) => set({ theme }),
  toggleTheme: () =>
    set((s) => {
      s.theme = s.theme === 'dark' ? 'light' : 'dark';
    }),
  setSidebarTab: (tab) => set({ sidebarTab: tab }),
  openModal: (m) => set({ modal: m }),
  closeModal: () => set({ modal: 'none' }),
})),
);
