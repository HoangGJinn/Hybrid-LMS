import { Link, useParams } from 'react-router'
import { AsyncView } from '@shared/components/AsyncView'
import { EmptyState } from '@shared/components/EmptyState'
import { StatusBadge } from '@shared/components/ui/badge'
import { useCourseGrades } from '../hooks/useCourseGrades'
import type { GradeRow } from '../types/grading.types'
import { toAsyncState } from '@shared/utils/async-state'
import { formatDateTime, formatScore } from '@shared/utils/format'

const rowStatus = ({ assignment, submission }: GradeRow): string => {
  if (submission) return submission.score !== null ? 'GRADED' : 'SUBMITTED'
  return assignment.status
}

const SummaryCard = ({ label, value }: { label: string; value: string | number }) => (
  <div className="rounded-xl border border-l-4 border-l-primary bg-card p-4 shadow-sm">
    <p className="m-0 text-xs text-muted-foreground">{label}</p>
    <p className="m-0 mt-1 text-2xl font-bold">{value}</p>
  </div>
)

const CourseGradesPage = () => {
  const { courseId = '' } = useParams()
  const state = toAsyncState(useCourseGrades(courseId))

  return (
    <AsyncView state={state} isEmpty={(rows) => rows.length === 0} empty={<EmptyState title="No graded work yet" description="Assignments for this course will appear here." />}>
      {(rows) => {
        const scores = rows.flatMap((r) => (r.submission?.score != null ? [r.submission.score] : []))
        const average = scores.length ? scores.reduce((sum, s) => sum + s, 0) / scores.length : null
        const waiting = rows.filter((r) => r.submission && r.submission.score === null).length
        return (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <SummaryCard label="Average score" value={formatScore(average)} />
              <SummaryCard label="Graded" value={`${scores.length} / ${rows.length}`} />
              <SummaryCard label="Awaiting grading" value={waiting} />
            </div>
            <div className="overflow-x-auto rounded-lg border bg-card">
              <table className="w-full border-collapse text-left text-sm">
                <caption className="sr-only">Assignment grades for this course</caption>
                <thead>
                  <tr className="border-b bg-muted/50 text-xs uppercase text-muted-foreground">
                    <th scope="col" className="px-4 py-3 font-medium">Assignment</th>
                    <th scope="col" className="px-4 py-3 font-medium">Due</th>
                    <th scope="col" className="px-4 py-3 font-medium">Status</th>
                    <th scope="col" className="px-4 py-3 font-medium">Score</th>
                    <th scope="col" className="px-4 py-3 font-medium">Feedback</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.assignment.id} className="border-b last:border-b-0">
                      <td className="px-4 py-3 font-medium"><Link to={`/student/courses/${courseId}/assignments/${row.assignment.id}`}>{row.assignment.title}</Link></td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatDateTime(row.assignment.endAt)}</td>
                      <td className="px-4 py-3"><StatusBadge status={rowStatus(row)} /></td>
                      <td className="whitespace-nowrap px-4 py-3 font-semibold">{formatScore(row.submission?.score)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{row.submission?.comment ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      }}
    </AsyncView>
  )
}

export default CourseGradesPage
