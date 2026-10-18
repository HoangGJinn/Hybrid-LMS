import { useState } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import {
  Bell,
  CalendarClock,
  CheckCheck,
  ClipboardList,
  GraduationCap,
  Info,
  Sparkles,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { AsyncView } from '@shared/components/AsyncView';
import { EmptyState } from '@shared/components/EmptyState';
import { PageHeader } from '@shared/components/PageHeader';
import { Button } from '@shared/components/ui/button';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '../hooks/useNotifications';
import { toAsyncState } from '@shared/utils/async-state';
import { cn } from '@shared/utils/cn';
import type {
  AppNotification,
  NotificationType,
} from '../types/notifications.types';
import { formatDateTime } from '@shared/utils/format';

type Filter = 'ALL' | 'UNREAD';

const TYPE_ICON: Record<NotificationType, LucideIcon> = {
  ASSIGNMENT: ClipboardList,
  EXAM: CalendarClock,
  GRADE: GraduationCap,
  QUIZ: Sparkles,
  SYSTEM: Info,
};

const NotificationsPage = () => {
  const state = toAsyncState(useNotifications());
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const [filter, setFilter] = useState<Filter>('ALL');

  const handleMarkAll = () =>
    markAllRead.mutate(undefined, {
      onSuccess: () => toast.success('All notifications marked as read'),
    });
  const handleOpen = (n: AppNotification) => {
    if (!n.isRead) markRead.mutate(n.id);
  };

  return (
    <div className="mx-auto max-w-3xl">
      <AsyncView
        state={state}
        isEmpty={(list) => list.length === 0}
        empty={
          <>
            <PageHeader title="Notifications" />
            <EmptyState
              title="You're all caught up"
              description="New notifications will show up here."
            />
          </>
        }
      >
        {(all) => {
          const unread = all.filter((n) => !n.isRead).length;
          const list = [...all]
            .filter((n) => filter === 'ALL' || !n.isRead)
            .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
          return (
            <>
              <PageHeader
                title="Notifications"
                subtitle={
                  unread > 0 ? `${unread} unread` : 'Everything is read'
                }
                actions={
                  <Button
                    variant="outline"
                    disabled={unread === 0 || markAllRead.isPending}
                    onClick={handleMarkAll}
                  >
                    <CheckCheck className="mr-2 h-4 w-4" />
                    Mark all as read
                  </Button>
                }
              />
              <div className="mb-4 flex gap-2">
                {(['ALL', 'UNREAD'] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    aria-pressed={filter === f}
                    onClick={() => setFilter(f)}
                    className={cn(
                      'rounded-full border px-3 py-1 text-xs font-medium',
                      filter === f
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'bg-card text-foreground',
                    )}
                  >
                    {f === 'ALL' ? 'All' : `Unread (${unread})`}
                  </button>
                ))}
              </div>
              {list.length === 0 ? (
                <EmptyState title="No unread notifications" />
              ) : (
                <ul className="m-0 list-none space-y-2 p-0">
                  {list.map((n) => {
                    const Icon = TYPE_ICON[n.type] ?? Bell;
                    const body = (
                      <>
                        <span
                          className={cn(
                            'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                            n.isRead
                              ? 'bg-muted text-muted-foreground'
                              : 'bg-primary/30 text-brand',
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span
                            className={cn(
                              'block text-sm',
                              n.isRead ? 'font-medium' : 'font-semibold',
                            )}
                          >
                            {n.title}
                          </span>
                          <span className="block text-sm text-muted-foreground">
                            {n.message}
                          </span>
                          <span className="mt-1 block text-xs text-muted-foreground">
                            {formatDateTime(n.createdAt)}
                          </span>
                        </span>
                        {!n.isRead && (
                          <span
                            aria-label="Unread"
                            className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-primary"
                          />
                        )}
                      </>
                    );
                    const rowClass = cn(
                      'flex items-start gap-3 rounded-xl border p-4 text-left text-foreground no-underline shadow-sm transition-colors hover:border-primary',
                      n.isRead ? 'bg-card' : 'bg-accent/60',
                    );
                    return (
                      <li key={n.id}>
                        {n.href ? (
                          <Link
                            to={n.href}
                            onClick={() => handleOpen(n)}
                            className={rowClass}
                          >
                            {body}
                          </Link>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpen(n)}
                            className={cn(rowClass, 'w-full')}
                          >
                            {body}
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          );
        }}
      </AsyncView>
    </div>
  );
};

export default NotificationsPage;
