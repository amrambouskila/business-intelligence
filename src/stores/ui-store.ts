import { create } from 'zustand';

export type SidebarTab = 'data' | 'charts' | 'layers' | 'style';
export type ModalType = 'none' | 'export' | 'settings' | 'filter';

interface UIState {
  theme: 'dark' | 'light';
  sidebarOpen: boolean;
  sidebarTab: SidebarTab;
  modal: ModalType;
  toggleTheme: () => void;
  setSidebarTab: (tab: SidebarTab) => void;
  openModal: (m: ModalType) => void;
  closeModal: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  theme: 'dark',
  sidebarOpen: true,
  sidebarTab: 'data',
  modal: 'none',
  toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
  setSidebarTab: (tab) => set({ sidebarTab: tab }),
  openModal: (m) => set({ modal: m }),
  closeModal: () => set({ modal: 'none' }),
}));
