// import { create } from 'zustand';

// interface UiState {
//   mobileNavOpen: boolean;
//   setMobileNavOpen: (open: boolean) => void;
// }

// export const useUiStore = create<UiState>((set) => ({
//   mobileNavOpen: false,
//   setMobileNavOpen: (open) => set({ mobileNavOpen: open }),
// }));


import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UiState {
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      mobileNavOpen: false,
      setMobileNavOpen: (open) => set({ mobileNavOpen: open }),
      sidebarCollapsed: false,
      toggleSidebar: () =>
        set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
    }),
    {
      name: 'ui-store',
      partialize: (s) => ({ sidebarCollapsed: s.sidebarCollapsed }),
    },
  ),
);