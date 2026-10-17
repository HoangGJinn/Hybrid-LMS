import { formatDateTime } from '@shared/utils/format'
import { AsyncView } from '@shared/components/AsyncView'
import { EmptyState } from '@shared/components/EmptyState'
import { PageHeader } from '@shared/components/PageHeader'
import { StatusBadge } from '@shared/components/ui/badge'
import { Button } from '@shared/components/ui/button'
import { toAsyncState } from '@shared/utils/async-state'
import { useUpcomingExams } from '../hooks/useExams'
import { Link } from 'react-router'
import { Clock } from 'lucide-react'

const examStatus = (start: string, end: string) => {
  const now = Date.now()
  if (now < +new Date(start)) return 'UPCOMING'
  if (now <= +new Date(end)) return 'OPEN'
  return 'COMPLETED'
}

const ExamsPage = () => {
  const state = toAsyncState(useUpcomingExams())
  return (
    <div>
      <PageHeader title="Exams" subtitle="Scheduled exams for your courses" />
      <AsyncView state={state} isEmpty={(d) => d.length === 0} empty={<EmptyState title="No exams scheduled" />}>
        {(exams) => (
          <ul className="m-0 list-none space-y-3 p-0">
            {[...exams].sort((a, b) => +new Date(a.startTime) - +new Date(b.startTime)).map((e) => {
              const status = examStatus(e.startTime, e.endTime)
              const mins = Math.round((+new Date(e.endTime) - +new Date(e.startTime)) / 60000)
              return (
                <li key={e.id} className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-4">
                  <div className="flex-1">
                    <p className="m-0 font-semibold">{e.examName}</p>
                    <p className="m-0 mt-1 flex items-center gap-1 text-sm text-muted-foreground"><Clock className="h-4 w-4" />{formatDateTime(e.startTime)} · {mins} minutes</p>
                  </div>
                  <StatusBadge status={status} />
                  {/* Demo: entry allowed anytime in mock mode; the backend enforces the real window. */}
                  <Button asChild variant={status === 'OPEN' ? 'default' : 'outline'}><Link to={`/student/courses/${e.classId}/exams/${e.id}`}>Enter Exam Room</Link></Button>
                </li>
              )
            })}
          </ul>
        )}
      </AsyncView>
    </div>
  )
}

export default ExamsPage
