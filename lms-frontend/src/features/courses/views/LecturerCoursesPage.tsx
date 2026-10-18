import { Link } from 'react-router';
import { Users } from 'lucide-react';
import { CourseCover } from '../components/CourseCover';
import { AsyncView } from '@shared/components/AsyncView';
import { EmptyState } from '@shared/components/EmptyState';
import { PageHeader } from '@shared/components/PageHeader';
import { toAsyncState } from '@shared/utils/async-state';
import { Bar } from '@shared/components/Bar';
import { useLecturerClasses } from '../hooks/useClasses';

const LecturerClassesPage = () => {
  const state = toAsyncState(useLecturerClasses());
  return (
    <div>
      <PageHeader
        title="My Classes"
        subtitle="Manage course content for each class"
      />
      <AsyncView
        state={state}
        isEmpty={(d) => d.length === 0}
        empty={
          <EmptyState
            title="No classes"
            description="No classes are assigned to you."
          />
        }
      >
        {(classes) => (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {classes.map((c) => (
              <Link
                key={c.id}
                to={`/lecturer/classes/${c.id}`}
                className="group overflow-hidden rounded-xl border bg-card text-foreground no-underline shadow-sm transition hover:border-primary hover:shadow-md"
              >
                <CourseCover course={c} className="aspect-video w-full" />
                <div className="p-5">
                  <p className="m-0 text-xs text-muted-foreground">
                    {c.classCode}
                  </p>
                  <p className="m-0 mt-1 font-semibold group-hover:text-brand">
                    {c.name}
                  </p>
                  <p className="m-0 mt-3 flex items-center gap-1 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    {c.studentCount} students
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <Bar value={c.progress} />
                    <span className="text-xs">{c.progress}%</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </AsyncView>
    </div>
  );
};

export default LecturerClassesPage;
