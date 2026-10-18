import { useState } from 'react';
import { useParams } from 'react-router';
import { Search } from 'lucide-react';
import { AsyncView } from '@shared/components/AsyncView';
import { EmptyState } from '@shared/components/EmptyState';
import { Input } from '@shared/components/ui/input';
import { useClassmates } from '../hooks/useClassmates';
import { toAsyncState } from '@shared/utils/async-state';
import { useAuthStore } from '@core/store/useAuthStore';

const getInitials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

const ClassmatesPage = () => {
  const { courseId = '' } = useParams();
  const state = toAsyncState(useClassmates(courseId));
  const myEmail = useAuthStore((s) => s.profile?.email);
  const [query, setQuery] = useState('');

  return (
    <AsyncView
      state={state}
      isEmpty={(list) => list.length === 0}
      empty={
        <EmptyState
          title="No classmates to show"
          description="The class roster is not available yet."
        />
      }
    >
      {(classmates) => {
        const needle = query.trim().toLowerCase();
        const visible = classmates.filter(
          (c) =>
            !needle ||
            c.fullName.toLowerCase().includes(needle) ||
            c.studentCode.includes(needle),
        );
        return (
          <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="m-0 text-sm text-muted-foreground">
                {classmates.length} students in this class
              </p>
              <div className="relative w-full sm:w-64">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by name or ID"
                  aria-label="Search classmates"
                  className="pl-9"
                />
              </div>
            </div>
            {visible.length === 0 ? (
              <EmptyState title="No student matches your search" />
            ) : (
              <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
                {visible.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm"
                  >
                    <div
                      aria-hidden="true"
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground"
                    >
                      {getInitials(c.fullName)}
                    </div>
                    <div className="min-w-0">
                      <p className="m-0 truncate text-sm font-semibold">
                        {c.fullName}
                        {c.email === myEmail && (
                          <span className="ml-2 rounded-full bg-primary/25 px-2 py-0.5 text-xs font-medium text-brand">
                            You
                          </span>
                        )}
                      </p>
                      <p className="m-0 truncate text-xs text-muted-foreground">
                        {c.studentCode} · {c.email}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      }}
    </AsyncView>
  );
};

export default ClassmatesPage;
