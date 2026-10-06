import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_PAGE_SIZE } from '@/constants/pagination';
import { STORAGE_KEYS } from '@/constants/storageKeys';

interface SettingsStore {
  sidebarCollapsed: boolean;
  notificationsEnabled: boolean;
  itemsPerPage: number;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setItemsPerPage: (count: number) => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      notificationsEnabled: true,
      itemsPerPage: DEFAULT_PAGE_SIZE,
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled }),
      setItemsPerPage: (itemsPerPage) => set({ itemsPerPage }),
    }),
    { name: STORAGE_KEYS.SETTINGS }
  )
);
