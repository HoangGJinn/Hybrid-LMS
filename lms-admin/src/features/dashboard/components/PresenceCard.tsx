import { useState } from 'react';
import { formatDateTime, formatRelativeTime } from '@/shared/utils/date';
import { initials } from '@/shared/utils/initials';
import type { TrafficOverviewStats } from '../types/dashboard.types';
import { Panel, Segmented } from './Panel';

type RoleFilter = 'ALL' | 'LECTURER' | 'STUDENT';

const ROLE_TABS: { value: RoleFilter; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'LECTURER', label: 'Lecturers' },
  { value: 'STUDENT', label: 'Students' },
];

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Admin',
  LECTURER: 'Lecturer',
  STUDENT: 'Student',
};

export const PresenceCard = ({ traffic }: { traffic: TrafficOverviewStats }) => {
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL');
  const users = traffic.onlineUsers.filter(
    (u) => roleFilter === 'ALL' || u.role === roleFilter,
  );

  return (
    <Panel
      className="h-full"
      title={
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-success" />
          Who&apos;s online
          <span className="font-normal tabular-nums text-muted-foreground">
            {traffic.onlineNowCount}
          </span>
        </span>
      }
      aside={
        <Segmented
          label="Role filter"
          value={roleFilter}
          options={ROLE_TABS}
          onChange={setRoleFilter}
        />
      }
    >
      {users.length === 0 ? (
        <p className="m-auto py-10 text-center text-sm text-muted-foreground">
          Nobody matching this filter was active in the last 5 minutes.
        </p>
      ) : (
        <ul className="m-0 -my-1 max-h-72 divide-y overflow-y-auto p-0">
          {users.map((user) => (
            <li
              key={user.id}
              className="flex list-none items-center justify-between gap-3 py-2"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="relative shrink-0">
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt=""
                      referrerPolicy="no-referrer"
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    <div
                      aria-hidden="true"
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground"
                    >
                      {initials(user.fullName)}
                    </div>
                  )}
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-success" />
                </div>
                <div className="min-w-0">
                  <p className="m-0 truncate text-sm font-medium">{user.fullName}</p>
                  <p className="m-0 truncate text-xs text-muted-foreground">
                    {ROLE_LABEL[user.role] ?? user.role}
                    {user.code && (
                      <span className="font-mono"> · {user.code}</span>
                    )}
                  </p>
                </div>
              </div>
              <span
                title={formatDateTime(user.lastSeenAt)}
                className="shrink-0 text-xs tabular-nums text-muted-foreground"
              >
                {formatRelativeTime(user.lastSeenAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
};
