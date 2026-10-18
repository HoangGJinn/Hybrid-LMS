import { Monitor, Moon, Sun } from 'lucide-react';
import { useThemeStore, type ThemeMode } from '@core/store/useThemeStore';

const MODE_META: Record<ThemeMode, { label: string; Icon: typeof Sun }> = {
  light: { label: 'Light', Icon: Sun },
  dark: { label: 'Dark', Icon: Moon },
  system: { label: 'System', Icon: Monitor },
};

/** Cycles light -> dark -> system. */
const ThemeToggle = () => {
  const mode = useThemeStore((s) => s.mode);
  const cycleMode = useThemeStore((s) => s.cycleMode);
  const { label, Icon } = MODE_META[mode];

  return (
    <button
      type="button"
      onClick={cycleMode}
      aria-label={`Theme: ${label}. Click to change`}
      title={`Theme: ${label}`}
      className="rounded-md border-0 bg-transparent p-2 text-foreground hover:bg-accent"
    >
      <Icon className="h-4 w-4" />
    </button>
  );
};

export default ThemeToggle;
