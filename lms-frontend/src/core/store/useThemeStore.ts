import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  mode: ThemeMode;
}
interface ThemeActions {
  setMode: (mode: ThemeMode) => void;
  cycleMode: () => void;
}

const NEXT_MODE: Record<ThemeMode, ThemeMode> = {
  light: 'dark',
  dark: 'system',
  system: 'light',
};

/** Only the user's preference is persisted (a trivial UI preference, per the Zustand guidelines). */
export const THEME_STORAGE_KEY = 'lms-theme';

export const useThemeStore = create<ThemeState & ThemeActions>()(
  persist(
    (set) => ({
      mode: 'system',
      setMode: (mode) => set({ mode }),
      cycleMode: () => set((state) => ({ mode: NEXT_MODE[state.mode] })),
    }),
    {
      name: THEME_STORAGE_KEY,
      version: 1,
      partialize: (state) => ({ mode: state.mode }),
    },
  ),
);
