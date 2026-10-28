import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router';
import { Users } from 'lucide-react';
import { AsyncView } from '@/shared/components/AsyncView';
import { PageHeader } from '@/shared/components/PageHeader';
import { Badge } from '@/shared/components/ui/Badge';
import { buttonClasses } from '@/shared/components/ui/button-classes';
import { formatDate } from '@/shared/utils/date';
import { useClass } from '../hooks/useClass';
import type { ClassView } from '../types/courses.types';

const Detail = ({ label, children }: { label: string; children: ReactNode }) => (
  <div>
    <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {label}
    </dt>
    <dd className="m-0 mt-1 text-sm">{children}</dd>
  </div>
);

const CourseDetail = ({ course }: { course: ClassView }) => (
  <>
    <PageHeader
      title={`${course.classCode} — ${course.name}`}
      subtitle="Course details"
      actions={
        <Link
          to={`/courses/${course.id}/participants`}
          className={buttonClasses('primary', 'md')}
        >
          <Users className="h-4 w-4" />
          Manage Participants
        </Link>
      }
    />
    <dl className="m-0 grid gap-5 rounded-xl border bg-card p-6 shadow-sm sm:grid-cols-2">
      <Detail label="Subject">
        {course.subjectCode} — {course.subjectName}
      </Detail>
      <Detail label="Semester">
        {course.semesterName} ({course.semesterCode})
      </Detail>
      <Detail label="Lecturer">{course.lecturerName || '—'}</Detail>
      <Detail label="Students">{course.studentCount ?? 0}</Detail>
      <Detail label="Status">
        {course.isActive ? (
          <Badge variant="success">Active</Badge>
        ) : (
          <Badge>Ended {formatDate(course.endedAt)}</Badge>
        )}
      </Detail>
    </dl>
  </>
);

/** "View Course Detail": where Manage Participants (UC-23) starts. */
const CourseDetailPage = () => {
  const { classId = '' } = useParams();
  const course = useClass(classId);

  return (
    <AsyncView
      state={{
        data: course.data,
        loading: course.isLoading,
        error: course.error,
        reload: () => void course.refetch(),
      }}
    >
      {(item) => <CourseDetail course={item} />}
    </AsyncView>
  );
};

export default CourseDetailPage;
