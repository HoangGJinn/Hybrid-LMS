import { Link, Outlet, useParams } from 'react-router';
import { AsyncView } from '@shared/components/AsyncView';
import { EmptyState } from '@shared/components/EmptyState';
import { toAsyncState } from '@shared/utils/async-state';
import { CourseBanner } from '../components/CourseBanner';
import { CourseTabs } from '../components/CourseTabs';
import { useCourse } from '../hooks/useCourse';

const tabs = [
  { label: 'Course', to: '.', end: true },
  { label: 'Members', to: 'members' },
  { label: 'Grades' },
  { label: 'Competencies' },
];

/** Banner + tab bar shared by the Course / Members pages of one class (lecturer). */
const LecturerCourseLayout = () => {
  const { courseId = '' } = useParams();
  const state = toAsyncState(useCourse(courseId));
  return (
    <AsyncView
      state={state}
      empty={
        <EmptyState
          title="Course not found"
          action={<Link to="/lecturer/classes">Back to My Classes</Link>}
        />
      }
    >
      {(course) => (
        <div>
          <CourseBanner
            course={course}
            breadcrumb={`${course.classCode} / ${course.lecturerName}`}
            title={course.name}
          />
          <div className="mt-4">
            <CourseTabs tabs={tabs} />
          </div>
          <div className="rounded-b-2xl bg-card p-6 shadow-sm">
            <Outlet />
          </div>
        </div>
      )}
    </AsyncView>
  );
};

export default LecturerCourseLayout;