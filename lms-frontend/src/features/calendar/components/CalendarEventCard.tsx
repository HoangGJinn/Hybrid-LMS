import { Link } from 'react-router';
import { cn } from '@shared/utils/cn';
import type { CalendarEvent } from '../types/calendar.types';
import { describeEventTime } from '../utils/calendarUtils';
import { getStatusBadge, KIND_META } from '../utils/eventMeta';

interface CalendarEventCardProps {
  event: CalendarEvent;
  /** Show the weekday and date too; needed when the card is not under a day heading. */
  withDate?: boolean;
}

export const CalendarEventCard = ({
  event,
  withDate = false,
}: CalendarEventCardProps) => {
  const status = getStatusBadge(event);
  return (
    <Link
      to={event.href}
      className="block rounded-lg border p-3 text-foreground no-underline hover:border-primary"
    >
      <span className="flex flex-wrap items-center gap-1.5">
        <span
          className={cn(
            'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
            KIND_META[event.kind].chip,
          )}
        >
          {KIND_META[event.kind].label}
        </span>
        {status && (
          <span
            className={cn(
              'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
              status.className,
            )}
          >
            {status.label}
          </span>
        )}
      </span>
      <p
        className={cn(
          'm-0 mt-1 text-sm font-medium',
          event.isDone && 'text-muted-foreground line-through',
        )}
      >
        {event.title}
      </p>
      <p className="m-0 text-xs text-muted-foreground">
        {describeEventTime(event, withDate)}
        {event.context && ` · ${event.context}`}
      </p>
    </Link>
  );
};