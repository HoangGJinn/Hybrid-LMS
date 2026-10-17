import { formatDateTime } from '@shared/utils/format'
import { AsyncView } from '@shared/components/AsyncView'
import { EmptyState } from '@shared/components/EmptyState'
import { PageHeader } from '@shared/components/PageHeader'
import { StatusBadge } from '@shared/components/ui/badge'
import { toAsyncState } from '@shared/utils/async-state'
import { cn } from '@shared/utils/cn'
import { useMyAssignments } from '../hooks/useAssignmentLists'
import type { AssignmentStatus } from '../types/assignments.types'
import { useState } from 'react'
import { Link } from 'react-router'
import { CalendarClock } from 'lucide-react'

const filters: (AssignmentStatus | 'ALL')[] = ['ALL', 'OPEN', 'UPCOMING', 'SUBMITTED', 'GRADED', 'OVERDUE']

const AssignmentsPage = () => {
  const state = toAsyncState(useMyAssignments())
  const [filter, setFilter] = useState<(typeof filters)[number]>('ALL')
  return (
    <div>
      <PageHeader title="Assignments" subtitle="Track deadlines and submit your work" />
      <div className="mb-4 flex flex-wrap gap-2">
        {filters.map((f) => (
          <button key={f} type="button" onClick={() => setFilter(f)} className={cn('rounded-full border px-3 py-1 text-xs font-medium', filter === f ? 'border-primary bg-primary text-primary-foreground' : 'bg-card')}>
            {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
          </button>
        ))}
      </div>
      <AsyncView state={state} isEmpty={(d) => d.length === 0} empty={<EmptyState title="No assignments" description="You have no assignments yet." />}>
        {(all) => {
          const list = [...all].filter((a) => filter === 'ALL' || a.status === filter).sort((a, b) => +new Date(a.endAt) - +new Date(b.endAt))
          if (list.length === 0) return <EmptyState title="No assignments match this filter" />
          return (
            <ul className="m-0 list-none space-y-3 p-0">
              {list.map((a) => (
                <li key={a.id}>
                  <Link to={`/student/courses/${a.classId}/assignments/${a.id}`} className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-4 text-foreground no-underline hover:border-primary">
                    <div className="min-w-0 flex-1">
                      <p className="m-0 font-semibold">{a.title}</p>
                      <p className="m-0 mt-1 truncate text-sm text-muted-foreground">{a.instruction}</p>
                    </div>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground"><CalendarClock className="h-4 w-4" />Due {formatDateTime(a.endAt)}</span>
                    <StatusBadge status={a.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )
        }}
      </AsyncView>
    </div>
  )
}

export default AssignmentsPage
