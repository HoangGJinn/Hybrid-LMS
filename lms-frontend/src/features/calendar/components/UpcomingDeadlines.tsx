import { AsyncView } from '@shared/components/AsyncView';
import { cn } from '@shared/utils/cn';
import { toAsyncState } from '@shared/utils/async-state';
import {
  UPCOMING_WINDOW_DAYS,
  useUpcomingDeadlines,
} from '../hooks/useUpcomingDeadlines';
import { BLUE_SCROLLBAR } from '../utils/scrollArea';
import { CalendarEventCard } from './CalendarEventCard';

const MAX_UPCOMING = 20;

export const UpcomingDeadlines = () => {
  const state = toAsyncState(useUpcomingDeadlines());
  return (
    <section className="flex flex-col rounded-xl border bg-card p-4 shadow-sm xl:min-h-0 xl:flex-[3]">
      <h2 className="mb-2 mt-0 shrink-0 text-base font-semibold">Coming up</h2>
      <div
        className={cn(
          'max-h-80 min-h-0 flex-1 overflow-y-auto pr-1 xl:max-h-none',
          BLUE_SCROLLBAR,
        )}
      >
        <AsyncView
          state={state}
          isEmpty={(events) => events.length === 0}
          empty={
            <p className="m-0 text-sm text-muted-foreground">
              Nothing due in the next {UPCOMING_WINDOW_DAYS} days.
            </p>
          }
        >
          {(events) => (
            <ul className="m-0 list-none space-y-2 p-0">
              {events.slice(0, MAX_UPCOMING).map((event) => (
                <li key={event.id}>
                  <CalendarEventCard event={event} withDate />
                </li>
              ))}
            </ul>
          )}
        </AsyncView>
      </div>
    </section>
  );
};