import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { GripVertical } from 'lucide-react';
import { cn } from '@shared/utils/cn';

export interface ResizableSplitPaneProps {
  left: ReactNode;
  right: ReactNode;
  initialLeftPercent?: number;
  minLeftPercent?: number;
  maxLeftPercent?: number;
  storageKey?: string;
  leftLabel?: string;
  rightLabel?: string;
  className?: string;
}

type MobileViewMode = 'stacked' | 'left' | 'right';

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const readSavedPercent = (
  storageKey: string | undefined,
  fallback: number,
  min: number,
  max: number,
): number => {
  if (!storageKey || typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return fallback;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? clamp(parsed, min, max) : fallback;
  } catch {
    return fallback;
  }
};

const getIsDesktop = (): boolean => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return true;
  }
  return window.matchMedia('(min-width: 1024px)').matches;
};

export const ResizableSplitPane = ({
  left,
  right,
  initialLeftPercent = 62,
  minLeftPercent = 35,
  maxLeftPercent = 78,
  storageKey,
  leftLabel = 'Preview',
  rightLabel = 'Grading',
  className,
}: ResizableSplitPaneProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDesktop, setIsDesktop] = useState<boolean>(getIsDesktop);
  const [mobileMode, setMobileMode] = useState<MobileViewMode>('stacked');
  const [isDragging, setIsDragging] = useState(false);
  const [leftPercent, setLeftPercent] = useState<number>(() =>
    readSavedPercent(
      storageKey,
      initialLeftPercent,
      minLeftPercent,
      maxLeftPercent,
    ),
  );

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const mq = window.matchMedia('(min-width: 1024px)');
    const onChange = () => setIsDesktop(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const persistPercent = useCallback(
    (value: number) => {
      if (!storageKey || typeof window === 'undefined') return;
      try {
        window.localStorage.setItem(storageKey, String(Math.round(value)));
      } catch {
        // Ignore storage quota errors
      }
    },
    [storageKey],
  );

  const updatePercent = useCallback(
    (next: number) => {
      const clamped = clamp(next, minLeftPercent, maxLeftPercent);
      setLeftPercent(clamped);
      persistPercent(clamped);
    },
    [minLeftPercent, maxLeftPercent, persistPercent],
  );

  useEffect(() => {
    if (!isDragging) return;

    const handlePointerMove = (e: PointerEvent) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0) return;
      const percent = ((e.clientX - rect.left) / rect.width) * 100;
      updatePercent(percent);
    };

    const handlePointerUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [isDragging, updatePercent]);

  const handleSplitterKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      updatePercent(leftPercent - 2);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      updatePercent(leftPercent + 2);
    } else if (e.key === 'Home') {
      e.preventDefault();
      updatePercent(minLeftPercent);
    } else if (e.key === 'End') {
      e.preventDefault();
      updatePercent(maxLeftPercent);
    }
  };

  if (!isDesktop) {
    return (
      <div className={cn('flex h-full min-h-0 flex-col gap-3', className)}>
        <div
          role="group"
          aria-label="Mobile layout view switcher"
          className="flex shrink-0 items-center gap-1 rounded-lg border bg-muted/40 p-1"
        >
          {(
            [
              ['stacked', 'Split (Stacked)'],
              ['left', `${leftLabel} Only`],
              ['right', `${rightLabel} Only`],
            ] as const
          ).map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              aria-pressed={mobileMode === mode}
              onClick={() => setMobileMode(mode)}
              className={cn(
                'flex-1 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors',
                mobileMode === mode
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
          {mobileMode !== 'right' && (
            <div
              className={cn(
                'min-h-0',
                mobileMode === 'stacked' ? 'h-[52vh]' : 'h-full',
              )}
            >
              {left}
            </div>
          )}
          {mobileMode !== 'left' && <div className="min-h-0">{right}</div>}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative flex h-full min-h-0 w-full flex-row',
        isDragging && 'select-none',
        className,
      )}
    >
      <div
        style={{ width: `${leftPercent}%` }}
        className="relative h-full min-h-0 min-w-0 shrink-0"
      >
        {left}
        {isDragging && <div className="absolute inset-0 z-20 cursor-col-resize" />}
      </div>

      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize preview and grading panes"
        aria-valuenow={Math.round(leftPercent)}
        aria-valuemin={minLeftPercent}
        aria-valuemax={maxLeftPercent}
        tabIndex={0}
        onPointerDown={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDoubleClick={() => updatePercent(initialLeftPercent)}
        onKeyDown={handleSplitterKeyDown}
        title="Drag to resize · Double-click to reset"
        className={cn(
          'group flex w-3 shrink-0 cursor-col-resize items-center justify-center transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          isDragging && 'bg-primary/15',
        )}
      >
        <div className="flex h-10 w-2 items-center justify-center rounded-full bg-border transition-colors group-hover:bg-primary/60">
          <GripVertical className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary-foreground" />
        </div>
      </div>

      <div className="relative h-full min-h-0 min-w-0 flex-1 overflow-y-auto">
        {right}
        {isDragging && <div className="absolute inset-0 z-20 cursor-col-resize" />}
      </div>
    </div>
  );
};

