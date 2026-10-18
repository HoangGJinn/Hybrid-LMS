import { Link } from 'react-router';
import { Bell } from 'lucide-react';
import { useUnreadCount } from '../hooks/useNotifications';

const NotificationBell = () => {
  const unread = useUnreadCount();
  const label =
    unread > 0 ? `Notifications, ${unread} unread` : 'Notifications';

  return (
    <Link
      to="/notifications"
      aria-label={label}
      title="Notifications"
      className="relative rounded-md p-2 text-foreground no-underline hover:bg-accent"
    >
      <Bell className="h-4 w-4" />
      {unread > 0 && (
        <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </Link>
  );
};

export default NotificationBell;
