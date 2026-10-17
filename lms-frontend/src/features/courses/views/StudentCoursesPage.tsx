import { Link } from 'react-router'
import { Users } from 'lucide-react'
import { CourseCover } from '../components/CourseCover'
import { AsyncView } from '@shared/components/AsyncView'
import { EmptyState } from '@shared/components/EmptyState'
import { PageHeader } from '@shared/components/PageHeader'
import { toAsyncState } from '@shared/utils/async-state'
import { useMyClasses } from '../hooks/useClasses'

const CoursesPage = () => {
  const state = toAsyncState(useMyClasses())
  return (
    <div>
      <PageHeader title="My Courses" subtitle="Courses you are enrolled in this semester" />
      <AsyncView state={state} isEmpty={(d) => d.length === 0} empty={<EmptyState title="No courses yet" description="You are not enrolled in any course." />}>
        {(classes) => (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {classes.map((c) => (
              <Link key={c.id} to={`/student/courses/${c.id}`} className="group overflow-hidden rounded-xl border bg-card text-foreground no-underline shadow-sm transition hover:border-primary hover:shadow-md">
                <CourseCover course={c} className="aspect-video w-full" />
                <div className="p-5">
                  <p className="m-0 text-xs text-muted-foreground">{c.classCode}</p>
                  <p className="mb-1 mt-1 text-lg font-semibold group-hover:text-brand">{c.name}</p>
                  <p className="m-0 text-sm text-muted-foreground">{c.lecturerName}</p>
                  <div className="mt-4 h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-primary" style={{ width: `${c.progress}%` }} /></div>
                  <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                    <span>{c.progress}% complete</span>
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" />{c.studentCount} students</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </AsyncView>
    </div>
  )
}

export default CoursesPage
