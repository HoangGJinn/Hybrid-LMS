import { cn } from '@shared/utils/cn';
import type {
  CalendarEventKind,
  CalendarKindFilter,
} from '../types/calendar.types';
import { KIND_META } from '../utils/eventMeta';

interface KindFilterProps {
  value: CalendarKindFilter;
  onChange: (value: CalendarKindFilter) => void;
}

const KINDS = Object.keys(KIND_META) as CalendarEventKind[];

/** Doubles as the legend: each kind keeps the colour it has on the grid. */
export const KindFilter = ({ value, onChange }: KindFilterProps) => (
  <div
    role="group"
    aria-label="Filter by type"
    className="mb-3 flex flex-wrap gap-2"
  >
    {(['ALL', ...KINDS] as const).map((kind) => (
      <button
        key={kind}
        type="button"
        aria-pressed={value === kind}
        onClick={() => onChange(kind)}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent',
          value === kind && 'border-primary bg-accent',
        )}
      >
        {kind !== 'ALL' && (
          <span
            aria-hidden="true"
            className={cn('h-2 w-2 rounded-full', KIND_META[kind].dot)}
          />
        )}
        {kind === 'ALL' ? 'All' : KIND_META[kind].label}
      </button>
    ))}
  </div>
);