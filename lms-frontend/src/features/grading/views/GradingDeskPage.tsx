import { toast } from 'sonner'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { FileText } from 'lucide-react'
import { AsyncView } from '@shared/components/AsyncView'
import { EmptyState } from '@shared/components/EmptyState'
import { PageHeader } from '@shared/components/PageHeader'
import { StatusBadge } from '@shared/components/ui/badge'
import { Button } from '@shared/components/ui/button'
import { Input } from '@shared/components/ui/input'
import { Label } from '@shared/components/ui/label'
import { toAsyncState } from '@shared/utils/async-state'
import { cn } from '@shared/utils/cn'
import { useGradeSubmission } from '../hooks/useGradeSubmission'
import { usePendingSubmissions } from '../hooks/usePendingSubmissions'
import type { PendingSubmission } from '../types/grading.types'
import { Card } from '@shared/components/ui/card'

/** Rendered with `key={sub.id}`, so the form starts fresh for each submission without an effect that copies props into state. */
const GradeForm = ({ sub }: { sub: PendingSubmission }) => {
  const gradeSubmission = useGradeSubmission()
  const [score, setScore] = useState(sub.score?.toString() ?? '')
  const [comment, setComment] = useState(sub.comment ?? '')
  const [validationError, setValidationError] = useState<string | null>(null)
  const error = validationError ?? gradeSubmission.error?.message ?? null
  const saving = gradeSubmission.isPending

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const n = Number(score)
    if (score === '' || Number.isNaN(n) || n < 0 || n > 10) return setValidationError('Score must be between 0 and 10.')
    setValidationError(null)
    gradeSubmission.mutate({ submissionId: sub.id, score: n, comment: comment.trim() }, { onSuccess: () => toast.success('Grade saved') })
  }

  return (
    <Card title={sub.studentName}>
      <p className="m-0 text-sm text-muted-foreground">{sub.assignment.title}</p>
      <p className="m-0 mt-1 text-xs text-muted-foreground">Submitted {new Date(sub.submittedAt).toLocaleString()}</p>
      <ul className="m-0 my-4 list-none space-y-2 p-0">
        {sub.fileNames.map((f) => (
          <li key={f} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"><FileText className="h-4 w-4 text-brand" />{f}</li>
        ))}
      </ul>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <Label htmlFor="score">Score (0–10)</Label>
          <Input id="score" type="number" step="0.25" min={0} max={10} value={score} onChange={(e) => setScore(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="comment">Feedback</Label>
          <textarea id="comment" rows={4} maxLength={1000} value={comment} onChange={(e) => setComment(e.target.value)} className="w-full rounded-md border bg-background p-2 text-sm" />
        </div>
        {error && <p className="m-0 text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={saving}>{saving ? 'Saving…' : sub.score === null ? 'Submit grade' : 'Update grade'}</Button>
      </form>
    </Card>
  )
}

const GradingDeskPage = () => {
  const state = toAsyncState(usePendingSubmissions())
  const [tab, setTab] = useState<'PENDING' | 'GRADED'>('PENDING')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  return (
    <div>
      <PageHeader title="Grading Desk" subtitle="Review submissions and give feedback" />
      <div className="mb-4 flex gap-2">
        {(['PENDING', 'GRADED'] as const).map((t) => (
          <button key={t} type="button" onClick={() => { setTab(t); setSelectedId(null) }} className={cn('rounded-full border px-3 py-1 text-xs font-medium', tab === t ? 'border-primary bg-primary text-primary-foreground' : 'bg-card')}>
            {t === 'PENDING' ? 'To grade' : 'Graded'}
          </button>
        ))}
      </div>
      <AsyncView state={state} isEmpty={(d) => d.length === 0} empty={<EmptyState title="No submissions yet" />}>
        {(all) => {
          const list = all.filter((s) => (tab === 'PENDING' ? s.score === null : s.score !== null))
          const selected = list.find((s) => s.id === selectedId) ?? list[0]
          if (list.length === 0) return <EmptyState title={tab === 'PENDING' ? 'Nothing to grade' : 'No graded submissions'} />
          return (
            <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
              <ul className="m-0 list-none space-y-2 p-0">
                {list.map((s) => (
                  <li key={s.id}>
                    <button type="button" onClick={() => setSelectedId(s.id)} className={cn('flex w-full items-center gap-3 rounded-lg border bg-card p-3 text-left', selected?.id === s.id && 'border-primary')}>
                      <div className="min-w-0 flex-1">
                        <p className="m-0 font-medium">{s.studentName}</p>
                        <p className="m-0 truncate text-xs text-muted-foreground">{s.assignment.title}</p>
                      </div>
                      {s.score !== null ? <span className="text-sm font-semibold">{s.score}</span> : <StatusBadge status="SUBMITTED" />}
                    </button>
                  </li>
                ))}
              </ul>
              {selected && <GradeForm key={selected.id} sub={selected} />}
            </div>
          )
        }}
      </AsyncView>
    </div>
  )
}

export default GradingDeskPage
