import { useThemeStore, type ThemeMode } from '@core/store/useThemeStore'

const DARK_QUERY = '(prefers-color-scheme: dark)'

export const systemPrefersDark = (): boolean => window.matchMedia(DARK_QUERY).matches

/** Subscribes to OS dark-mode changes; returns the unsubscribe function. */
export const subscribeToSystemTheme = (onChange: () => void): (() => void) => {
  const media = window.matchMedia(DARK_QUERY)
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}

export const resolveTheme = (mode: ThemeMode): 'light' | 'dark' =>
  mode === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : mode

const applyTheme = (mode: ThemeMode): void => {
  const root = document.documentElement
  const resolved = resolveTheme(mode)
  root.classList.toggle('dark', resolved === 'dark')
  root.style.colorScheme = resolved
}

/** Keeps <html class="dark"> in sync with the store and the OS setting. Call once at startup. */
export const initTheme = (): (() => void) => {
  applyTheme(useThemeStore.getState().mode)
  const handleSystemChange = () => { if (useThemeStore.getState().mode === 'system') applyTheme('system') }
  const unsubscribeSystem = subscribeToSystemTheme(handleSystemChange)
  const unsubscribeStore = useThemeStore.subscribe((state) => applyTheme(state.mode))
  return () => { unsubscribeSystem(); unsubscribeStore() }
}
