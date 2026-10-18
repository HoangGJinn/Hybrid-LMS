import { useSyncExternalStore } from 'react';
import { useThemeStore } from '@core/store/useThemeStore';
import {
  subscribeToSystemTheme,
  systemPrefersDark,
} from '../utils/themeRuntime';

/** 'light' | 'dark' after resolving the "system" option (for libraries that need an explicit theme). */
export const useResolvedTheme = (): 'light' | 'dark' => {
  const mode = useThemeStore((s) => s.mode);
  const systemDark = useSyncExternalStore(
    subscribeToSystemTheme,
    systemPrefersDark,
    () => false,
  );
  return mode === 'system' ? (systemDark ? 'dark' : 'light') : mode;
};
