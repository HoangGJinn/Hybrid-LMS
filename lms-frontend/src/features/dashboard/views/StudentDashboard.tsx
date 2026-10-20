import { Link } from 'react-router';
import { CourseCover } from '@features/courses';
import { AsyncView } from '@shared/components/AsyncView';
import { HeroHeader } from '@shared/components/HeroHeader';
import { StatusBadge } from '@shared/components/ui/badge';
import { toAsyncState } from '@shared/utils/async-state';
import { useStudentDashboard } from '../hooks/useStudentDashboard';
import { useCurrentUser } from '@features/auth';
import { formatDate, formatPercentage } from '@shared/utils/format';

const Stat = ({ label, value }: { label: string; value: string | number }) => (
  <div className="rounded-xl border border-l-4 border-l-primary bg-card p-4 shadow-sm">
    <p className="m-0 text-xs text-muted-foreground">{label}</p>
    <p className="m-0 mt-1 text-2xl font-bold">{value}</p>
  </div>
);

const StudentDashboard = () => {
  const { data: user } = useCurrentUser();
  const name = user?.fullName ?? 'Student';
  const state = toAsyncState(useStudentDashboard());
  return (
    <div>
      <HeroHeader
        title={`Welcome back, ${name}`}
        subtitle="Here is your learning overview"
      />
      <AsyncView state={state}>
        {({ classes, assignments, kcs }) => {
          const pending = assignments.filter((a) => a.status === 'OPEN');
          const avg = kcs.length
            ? kcs.reduce((s, k) => s + k.pMastery, 0) / kcs.length
            : 0;
          const weak = [...kcs]
            .filter((k) => k.pMastery < 0.4)
            .sort((a, b) => a.pMastery - b.pMastery);
          return (
            <div className="space-y-6">
              <section className="grid gap-4 md:grid-cols-4">
                <Stat label="Active courses" value={classes.length} />
                <Stat label="Pending assignments" value={pending.length} />
                <Stat
                  label="Average KC mastery"
                  value={formatPercentage(avg)}
                />
                <Stat label="KCs to review" value={weak.length} />
              </section>
              <section className="grid gap-4 md:grid-cols-3">
                {classes.map((c) => (
                  <Link
                    key={c.id}
                    to={`/student/courses/${c.id}`}
                    className="overflow-hidden rounded-xl border bg-card text-foreground no-underline shadow-sm transition hover:border-primary hover:shadow-md"
                  >
                    <CourseCover course={c} className="aspect-[16/7] w-full" />
                    <div className="p-4">
                      <p className="m-0 text-xs text-muted-foreground">
                        {c.classCode}
                      </p>
                      <p className="mt-1 font-semibold">{c.name}</p>
                      <div className="mt-3 h-2 rounded-full bg-muted">
                        <div
                          className="h-2 rounded-full bg-primary"
                          style={{ width: `${c.progress}%` }}
                        />
                      </div>
                      <p className="mb-0 mt-1 text-xs text-muted-foreground">
                        {c.progress}% complete
                      </p>
                    </div>
                  </Link>
                ))}
              </section>
              <div className="grid gap-4 lg:grid-cols-2">
                <section className="rounded-xl border bg-card p-4 shadow-sm">
                  <h2 className="mt-0 text-lg font-semibold">
                    Upcoming deadlines
                  </h2>
                  {pending.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No pending assignments.
                    </p>
                  ) : (
                    <ul className="m-0 list-none space-y-2 p-0">
                      {pending.map((a) => (
                        <li
                          key={a.id}
                          className="flex items-center justify-between text-sm"
                        >
                          <Link
                            to={`/student/courses/${a.classId}/assignments/${a.id}`}
                          >
                            {a.title}
                          </Link>
                          <span className="flex items-center gap-2 text-muted-foreground">
                            <StatusBadge status={a.status} />
                            {formatDate(a.endAt)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
                <section className="rounded-xl border bg-card p-4 shadow-sm">
                  <h2 className="mt-0 text-lg font-semibold">
                    Recommended review
                  </h2>
                  {weak.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Great job — no weak KCs right now.
                    </p>
                  ) : (
                    <ul className="m-0 list-none space-y-2 p-0">
                      {weak.slice(0, 5).map((k) => (
                        <li key={k.id} className="flex justify-between text-sm">
                          <span>{k.kcName}</span>
                          <span className="text-destructive">
                            {formatPercentage(k.pMastery)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <Link
                    to="/student/mastery"
                    className="mt-3 inline-block text-sm"
                  >
                    View mastery →
                  </Link>
                </section>
              </div>
            </div>
          );
        }}
      </AsyncView>
    </div>
  );
};

export default StudentDashboard;
