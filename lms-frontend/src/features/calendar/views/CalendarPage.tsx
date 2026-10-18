import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { AsyncView } from '@shared/components/AsyncView';
import { PageHeader } from '@shared/components/PageHeader';
import { Button } from '@shared/components/ui/button';
import { useCalendarEvents } from '../hooks/useCalendarEvents';
import type { CalendarEvent, CalendarEventKind } from '../types/calendar.types';
import { toAsyncState } from '@shared/utils/async-state';
import { cn } from '@shared/utils/cn';
import { formatDateTime } from '@shared/utils/format';
import {
  addMonths,
  buildMonthGrid,
  dateKey,
  isSameMonth,
  startOfMonth,
  weekdayLabels,
} from '../utils/calendarUtils';

const MAX_CHIPS_PER_DAY = 2;

const KIND_META: Record<
  CalendarEventKind,
  { label: string; chip: string; dot: string }
> = {
  ASSIGNMENT: {
    label: 'Assignment',
    chip: 'bg-primary/30 text-brand',
    dot: 'bg-primary',
  },
  EXAM: {
    label: 'Exam',
    chip: 'bg-destructive/15 text-destructive',
    dot: 'bg-destructive',
  },
  REVIEW: {
    label: 'Review',
    chip: 'bg-warning/25 text-foreground',
    dot: 'bg-warning',
  },
};

const monthFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  year: 'numeric',
});
const dayFormatter = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
});

const CalendarPage = () => {
  const state = toAsyncState(useCalendarEvents());
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selectedKey, setSelectedKey] = useState(() => dateKey(new Date()));
  const todayKey = dateKey(new Date());
  const cells = useMemo(() => buildMonthGrid(month), [month]);

  const handleToday = () => {
    setMonth(startOfMonth(new Date()));
    setSelectedKey(todayKey);
  };

  return (
    <div>
      <PageHeader
        title="Calendar"
        subtitle="Assignment deadlines, exams and scheduled reviews"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              aria-label="Previous month"
              onClick={() => setMonth((m) => addMonths(m, -1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span
              aria-live="polite"
              className="min-w-36 text-center text-sm font-semibold"
            >
              {monthFormatter.format(month)}
            </span>
            <Button
              variant="outline"
              size="icon"
              aria-label="Next month"
              onClick={() => setMonth((m) => addMonths(m, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={handleToday}>
              Today
            </Button>
          </div>
        }
      />
      <AsyncView state={state}>
        {(events) => {
          const byDay = new Map<string, CalendarEvent[]>();
          events.forEach((event) => {
            const key = dateKey(new Date(event.at));
            byDay.set(key, [...(byDay.get(key) ?? []), event]);
          });
          const selectedEvents = byDay.get(selectedKey) ?? [];
          return (
            <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
              <section
                aria-label="Month view"
                className="overflow-hidden rounded-xl border bg-card shadow-sm"
              >
                <div className="grid grid-cols-7 border-b bg-muted/50 text-center text-xs font-medium uppercase text-muted-foreground">
                  {weekdayLabels().map((d) => (
                    <div key={d} className="py-2">
                      {d}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7">
                  {cells.map((day) => {
                    const key = dateKey(day);
                    const dayEvents = byDay.get(key) ?? [];
                    const inMonth = isSameMonth(day, month);
                    const isToday = key === todayKey;
                    const isSelected = key === selectedKey;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setSelectedKey(key)}
                        aria-pressed={isSelected}
                        aria-label={`${dayFormatter.format(day)}, ${dayEvents.length} event${dayEvents.length === 1 ? '' : 's'}`}
                        className={cn(
                          'flex min-h-16 flex-col items-stretch gap-1 border-0 border-b border-r bg-transparent p-1.5 text-left text-foreground transition-colors hover:bg-accent sm:min-h-24',
                          !inMonth && 'bg-muted/30 text-muted-foreground',
                          isSelected &&
                            'bg-accent ring-2 ring-inset ring-primary',
                        )}
                      >
                        <span
                          className={cn(
                            'flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium',
                            isToday && 'bg-primary text-primary-foreground',
                          )}
                        >
                          {day.getDate()}
                        </span>
                        <span className="hidden flex-col gap-1 sm:flex">
                          {dayEvents.slice(0, MAX_CHIPS_PER_DAY).map((e) => (
                            <span
                              key={e.id}
                              className={cn(
                                'truncate rounded px-1.5 py-0.5 text-[11px] font-medium',
                                KIND_META[e.kind].chip,
                              )}
                            >
                              {e.title}
                            </span>
                          ))}
                          {dayEvents.length > MAX_CHIPS_PER_DAY && (
                            <span className="px-1 text-[11px] text-muted-foreground">
                              +{dayEvents.length - MAX_CHIPS_PER_DAY} more
                            </span>
                          )}
                        </span>
                        <span
                          className="flex gap-1 sm:hidden"
                          aria-hidden="true"
                        >
                          {dayEvents.slice(0, 3).map((e) => (
                            <span
                              key={e.id}
                              className={cn(
                                'h-1.5 w-1.5 rounded-full',
                                KIND_META[e.kind].dot,
                              )}
                            />
                          ))}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>

              <aside aria-label="Selected day" className="space-y-4">
                <section className="rounded-xl border bg-card p-4 shadow-sm">
                  <h2 className="mt-0 text-base font-semibold">
                    {dayFormatter.format(new Date(`${selectedKey}T00:00:00`))}
                  </h2>
                  {selectedEvents.length === 0 ? (
                    <p className="m-0 text-sm text-muted-foreground">
                      Nothing scheduled.
                    </p>
                  ) : (
                    <ul className="m-0 list-none space-y-2 p-0">
                      {selectedEvents.map((e) => (
                        <li key={e.id}>
                          <Link
                            to={e.href}
                            className="block rounded-lg border p-3 text-foreground no-underline hover:border-primary"
                          >
                            <span
                              className={cn(
                                'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                                KIND_META[e.kind].chip,
                              )}
                            >
                              {KIND_META[e.kind].label}
                            </span>
                            <p className="m-0 mt-1 text-sm font-medium">
                              {e.title}
                            </p>
                            <p className="m-0 text-xs text-muted-foreground">
                              {formatDateTime(e.at)}
                              {e.context && ` · ${e.context}`}
                            </p>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
                <section className="rounded-xl border bg-card p-4 shadow-sm">
                  <h2 className="mt-0 text-sm font-semibold">Legend</h2>
                  <ul className="m-0 flex list-none flex-wrap gap-3 p-0 text-xs text-muted-foreground">
                    {(Object.keys(KIND_META) as CalendarEventKind[]).map(
                      (k) => (
                        <li key={k} className="flex items-center gap-1.5">
                          <span
                            className={cn(
                              'h-2.5 w-2.5 rounded-full',
                              KIND_META[k].dot,
                            )}
                          />
                          {KIND_META[k].label}
                        </li>
                      ),
                    )}
                  </ul>
                </section>
              </aside>
            </div>
          );
        }}
      </AsyncView>
    </div>
  );
};

export default CalendarPage;
