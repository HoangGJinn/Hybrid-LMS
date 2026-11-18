import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { AsyncView } from '@shared/components/AsyncView';
import { PageHeader } from '@shared/components/PageHeader';
import { Button } from '@shared/components/ui/button';
import { toAsyncState } from '@shared/utils/async-state';
import { cn } from '@shared/utils/cn';
import { CalendarEventCard } from '../components/CalendarEventCard';
import { KindFilter } from '../components/KindFilter';
import { UpcomingDeadlines } from '../components/UpcomingDeadlines';
import { useCalendarEvents } from '../hooks/useCalendarEvents';
import type { CalendarKindFilter } from '../types/calendar.types';
import {
  addMonths,
  buildMonthGrid,
  dateKey,
  formatTime,
  groupByDay,
  isSameMonth,
  startOfMonth,
  weekdayLabels,
} from '../utils/calendarUtils';
import { getChipClassName, KIND_META } from '../utils/eventMeta';
import { BLUE_SCROLLBAR } from '../utils/scrollArea';

const MAX_CHIPS_PER_DAY = 2;
const MAX_DOTS_PER_DAY = 3;

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
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selectedKey, setSelectedKey] = useState(() => dateKey(new Date()));
  const [filter, setFilter] = useState<CalendarKindFilter>('ALL');
  const state = toAsyncState(useCalendarEvents(month));
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
        subtitle="Assignment deadlines and exams across your classes."
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
      <KindFilter value={filter} onChange={setFilter} />
      <AsyncView state={state}>
        {(events) => {
          const byDay = groupByDay(events, filter);
          const selectedEvents = byDay.get(selectedKey) ?? [];
          return (
            <div className="grid gap-4 xl:h-[calc(100dvh-16.5rem)] xl:min-h-[30rem] xl:grid-cols-[1fr_320px] xl:grid-rows-1">
              <section
                aria-label="Month view"
                className="flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm xl:min-h-0"
              >
                <div className="grid grid-cols-7 border-b bg-muted/50 text-center text-xs font-medium uppercase text-muted-foreground">
                  {weekdayLabels().map((d) => (
                    <div key={d} className="py-1.5">
                      {d}
                    </div>
                  ))}
                </div>
                <div className="grid flex-1 grid-cols-7 xl:grid-rows-6">
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
                          'flex min-h-16 flex-col items-stretch gap-0.5 overflow-hidden border-0 border-b border-r bg-transparent p-1 text-left text-foreground transition-colors hover:bg-accent sm:min-h-20 xl:min-h-0',
                          !inMonth && 'bg-muted/30 text-muted-foreground',
                          isSelected &&
                            'bg-accent ring-2 ring-inset ring-primary',
                        )}
                      >
                        <span className="flex items-center justify-between">
                          <span
                            className={cn(
                              'flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-medium',
                              isToday && 'bg-primary text-primary-foreground',
                            )}
                          >
                            {day.getDate()}
                          </span>
                          {dayEvents.length > MAX_CHIPS_PER_DAY && (
                            <span className="hidden pr-0.5 text-[10px] text-muted-foreground sm:inline">
                              +{dayEvents.length - MAX_CHIPS_PER_DAY} more
                            </span>
                          )}
                        </span>
                        <span className="hidden flex-col gap-0.5 sm:flex">
                          {dayEvents.slice(0, MAX_CHIPS_PER_DAY).map((e) => (
                            <span
                              key={e.id}
                              className={cn(
                                'truncate rounded px-1 text-[10px] font-medium leading-4',
                                getChipClassName(e),
                                e.isDone && 'line-through opacity-60',
                              )}
                            >
                              {formatTime(e.at)} {e.title}
                            </span>
                          ))}
                        </span>
                        <span
                          className="flex gap-1 sm:hidden"
                          aria-hidden="true"
                        >
                          {dayEvents.slice(0, MAX_DOTS_PER_DAY).map((e) => (
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

              <aside
                aria-label="Selected day"
                className="flex flex-col gap-4 xl:min-h-0"
              >
                <section className="flex flex-col rounded-xl border bg-card p-4 shadow-sm xl:min-h-0 xl:flex-[2]">
                  <h2 className="mb-2 mt-0 shrink-0 text-base font-semibold">
                    {dayFormatter.format(new Date(`${selectedKey}T00:00:00`))}
                  </h2>
                  <div
                    className={cn(
                      'max-h-80 min-h-0 flex-1 overflow-y-auto pr-1 xl:max-h-none',
                      BLUE_SCROLLBAR,
                    )}
                  >
                    {selectedEvents.length === 0 ? (
                      <p className="m-0 text-sm text-muted-foreground">
                        Nothing scheduled.
                      </p>
                    ) : (
                      <ul className="m-0 list-none space-y-2 p-0">
                        {selectedEvents.map((e) => (
                          <li key={e.id}>
                            <CalendarEventCard event={e} />
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </section>
                <UpcomingDeadlines />
              </aside>
            </div>
          );
        }}
      </AsyncView>
    </div>
  );
};

export default CalendarPage;