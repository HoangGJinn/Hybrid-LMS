import { Link, NavLink, Outlet, useParams } from 'react-router'
import { CourseCover } from '../components/CourseCover'
import { AsyncView } from '@shared/components/AsyncView'
import { EmptyState } from '@shared/components/EmptyState'
import { useCourse } from '../hooks/useCourse'
import { toAsyncState } from '@shared/utils/async-state'
import { cn } from '@shared/utils/cn'

const tabs = [
  { label: 'Content', to: '.', end: true },
  { label: 'Grades', to: 'grades', end: false },
  { label: 'Classmates', to: 'classmates', end: false },
] as const

/** Banner + tab bar shared by the Content / Grades / Classmates pages of one course. */
const CourseLayout = () => {
  const { courseId = '' } = useParams()
  const state = toAsyncState(useCourse(courseId))

  return (
    <AsyncView state={state} empty={<EmptyState title="Course not found" action={<Link to="/student/courses">Back to My Courses</Link>} />}>
      {(course) => (
        <div>
          <div className="relative mb-4 overflow-hidden rounded-2xl shadow-sm">
            <CourseCover course={course} className="h-40 w-full sm:h-48" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-5 text-white">
              <h1 className="m-0 text-2xl font-bold">{course.name}</h1>
              <p className="m-0 mt-1 text-sm opacity-90">{course.classCode} · {course.lecturerName}</p>
            </div>
          </div>
          <nav aria-label="Course sections" className="mb-5 flex gap-1 border-b">
            {tabs.map(({ label, to, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn('-mb-px border-b-2 px-4 py-2 text-sm font-medium no-underline transition-colors',
                    isActive ? 'border-primary text-brand' : 'border-transparent text-muted-foreground hover:text-foreground')
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
          <Outlet />
        </div>
      )}
    </AsyncView>
  )
}

export default CourseLayout
