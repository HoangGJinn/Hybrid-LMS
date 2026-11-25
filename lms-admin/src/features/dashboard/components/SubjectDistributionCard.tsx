import { cn } from '@/shared/utils/cn';
import type { SubjectDistributionItem } from '../types/dashboard.types';
import { Panel } from './Panel';

export const SubjectDistributionCard = ({
  items,
}: {
  items: SubjectDistributionItem[];
}) => {
  const maxClasses = Math.max(1, ...items.map((i) => i.activeClassCount));
  const maxStudents = Math.max(1, ...items.map((i) => i.enrolledStudentCount));

  return (
    <Panel
      className="h-full"
      title="Enrolment by subject"
      aside={
        <ul className="m-0 flex gap-3 p-0 text-xs text-muted-foreground">
          <li className="flex list-none items-center gap-1.5">
            <span className="h-2 w-3 rounded-[2px] bg-muted-foreground/40" />
            Courses
          </li>
          <li className="flex list-none items-center gap-1.5">
            <span className="h-2 w-3 rounded-[2px] bg-brand" />
            Students
          </li>
        </ul>
      }
    >
      {items.length === 0 ? (
        <p className="m-auto py-8 text-center text-[13px] text-muted-foreground">
          0 active courses.
        </p>
      ) : (
        <ul className="m-0 space-y-3.5 p-0">
          {items.map((item) => (
            <li key={item.subjectId} className="list-none">
              <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[13px]">
                <span className="min-w-0 truncate">
                  <span className="font-mono text-xs text-muted-foreground">
                    {item.subjectCode}
                  </span>{' '}
                  <span className="font-medium">{item.subjectName}</span>
                </span>
                <span
                  className={cn(
                    'shrink-0 text-xs tabular-nums',
                    item.enrolledStudentCount === 0
                      ? 'text-warning'
                      : 'text-muted-foreground',
                  )}
                >
                  {item.activeClassCount}{' '}
                  {item.activeClassCount === 1 ? 'course' : 'courses'},{' '}
                  {item.enrolledStudentCount}{' '}
                  {item.enrolledStudentCount === 1 ? 'student' : 'students'}
                </span>
              </div>
              <div className="space-y-1">
                <div className="h-1 rounded-full bg-muted">
                  <div
                    style={{
                      width: `${(item.activeClassCount / maxClasses) * 100}%`,
                    }}
                    className="h-full rounded-full bg-muted-foreground/40"
                  />
                </div>
                <div className="h-1 rounded-full bg-muted">
                  <div
                    style={{
                      width: `${(item.enrolledStudentCount / maxStudents) * 100}%`,
                    }}
                    className="h-full rounded-full bg-brand"
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
};
