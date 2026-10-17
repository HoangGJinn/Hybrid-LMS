import { Link } from 'react-router'
import { BookOpen, ClipboardList, Sparkles, Users } from 'lucide-react'
import { CourseCover } from '@features/courses'
import { AsyncView } from '@shared/components/AsyncView'
import { EmptyState } from '@shared/components/EmptyState'
import { HeroHeader } from '@shared/components/HeroHeader'
import { Button } from '@shared/components/ui/button'
import { toAsyncState } from '@shared/utils/async-state'
import { useLecturerDashboard } from '../hooks/useLecturerDashboard'
import { useAuthStore } from '@core/store/useAuthStore'
import { Bar } from '@shared/components/Bar'
import { Card } from '@shared/components/ui/card'
import { StatCard } from '@shared/components/StatCard'

const LecturerDashboard = () => {
  const name = useAuthStore((s) => s.profile?.fullName ?? 'Lecturer')
  const state = toAsyncState(useLecturerDashboard())

  return (
    <div>
      <HeroHeader
        title={`Welcome back, ${name}`}
        subtitle="Overview of your classes, pending grading and analytics"
        actions={<Button asChild variant="outline" className="border-0 bg-card text-foreground"><Link to="/lecturer/ai-generator" className="no-underline"><Sparkles className="mr-2 h-4 w-4" />Generate assessment</Link></Button>}
      />
      <AsyncView state={state} isEmpty={(d) => d.classes.length === 0} empty={<EmptyState title="No classes assigned" description="You are not teaching any class this semester." />}>
        {({ classes, pending }) => {
          const toGrade = pending.filter((p) => p.score === null)
          const students = classes.reduce((n, c) => n + c.studentCount, 0)
          return (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label="Active classes" value={classes.length} icon={<BookOpen className="h-4 w-4" />} />
                <StatCard label="Total students" value={students} icon={<Users className="h-4 w-4" />} />
                <StatCard label="Pending grading" value={toGrade.length} hint="Submissions awaiting a score" icon={<ClipboardList className="h-4 w-4" />} />
                <StatCard label="Avg. progress" value={`${Math.round(classes.reduce((n, c) => n + c.progress, 0) / classes.length)}%`} />
              </div>
              <div className="grid gap-6 lg:grid-cols-3">
                <Card title="My classes" className="lg:col-span-2">
                  <ul className="m-0 list-none space-y-4 p-0">
                    {classes.map((c) => (
                      <li key={c.id} className="flex items-center gap-4">
                        <CourseCover course={c} className="h-14 w-24 shrink-0 rounded-lg" />
                        <div className="min-w-0 flex-1">
                          <Link to={`/lecturer/classes/${c.id}`} className="font-medium text-foreground no-underline hover:text-brand">{c.name}</Link>
                          <p className="m-0 text-xs text-muted-foreground">{c.classCode} · {c.studentCount} students</p>
                          <div className="mt-2"><Bar value={c.progress} /></div>
                        </div>
                        <span className="text-sm font-medium">{c.progress}%</span>
                      </li>
                    ))}
                  </ul>
                </Card>
                <Card title="Needs grading" actions={<Link to="/lecturer/grading" className="text-sm">View all</Link>}>
                  {toGrade.length === 0 ? (
                    <p className="m-0 text-sm text-muted-foreground">All caught up 🎉</p>
                  ) : (
                    <ul className="m-0 list-none space-y-3 p-0">
                      {toGrade.slice(0, 5).map((s) => (
                        <li key={s.id} className="text-sm">
                          <p className="m-0 font-medium">{s.studentName}</p>
                          <p className="m-0 text-xs text-muted-foreground">{s.assignment.title} · {new Date(s.submittedAt).toLocaleDateString()}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              </div>
            </div>
          )
        }}
      </AsyncView>
    </div>
  )
}

export default LecturerDashboard
