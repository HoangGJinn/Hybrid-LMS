import { CalendarClock } from 'lucide-react'
import { AsyncView } from '@shared/components/AsyncView'
import { EmptyState } from '@shared/components/EmptyState'
import { PageHeader } from '@shared/components/PageHeader'
import { toAsyncState } from '@shared/utils/async-state'
import { cn } from '@shared/utils/cn'
import { useMasteryOverview } from '../hooks/useMastery'
import RadarChart from '../components/RadarChart'

const level = (p: number) => (p >= 0.7 ? { label: 'Mastered', cls: 'bg-emerald-500' } : p >= 0.4 ? { label: 'Developing', cls: 'bg-amber-500' } : { label: 'Needs review', cls: 'bg-destructive' })

const MasteryPage = () => {
  const state = toAsyncState(useMasteryOverview())
  return (
    <div>
      <PageHeader title="Knowledge Mastery" subtitle="Your mastery of each knowledge component (KC)" />
      <AsyncView state={state} isEmpty={(d) => d.kcs.length === 0} empty={<EmptyState title="No mastery data yet" description="Complete a quiz to start tracking your mastery." />}>
        {({ kcs, competencies }) => {
          const reviews = kcs.filter((k) => k.nextReviewAt).sort((a, b) => +new Date(a.nextReviewAt!) - +new Date(b.nextReviewAt!))
          return (
            <div className="grid gap-6 lg:grid-cols-2">
              <section className="flex flex-col items-center rounded-lg border bg-card p-4">
                <h2 className="mt-0 self-start text-lg font-semibold">Mastery overview</h2>
                {kcs.length >= 3 ? <RadarChart data={kcs.map((k) => ({ label: k.kcName, value: k.pMastery }))} /> : <p className="text-sm text-muted-foreground">At least 3 KCs are needed for the radar view.</p>}
              </section>
              <section className="rounded-lg border bg-card p-4">
                <h2 className="mt-0 text-lg font-semibold">Knowledge components</h2>
                <ul className="m-0 list-none space-y-3 p-0">
                  {[...kcs].sort((a, b) => a.pMastery - b.pMastery).map((k) => {
                    const l = level(k.pMastery)
                    return (
                      <li key={k.id}>
                        <div className="flex justify-between text-sm"><span className="font-medium">{k.kcName}</span><span className="text-muted-foreground">{Math.round(k.pMastery * 100)}% · {l.label}</span></div>
                        <div className="mt-1 h-2 rounded bg-muted"><div className={cn('h-2 rounded', l.cls)} style={{ width: `${k.pMastery * 100}%` }} /></div>
                        <p className="m-0 mt-1 text-xs text-muted-foreground">{k.attemptsCount} attempts</p>
                      </li>
                    )
                  })}
                </ul>
              </section>
              <section className="rounded-lg border bg-card p-4">
                <h2 className="mt-0 text-lg font-semibold">Review schedule</h2>
                {reviews.length === 0 ? <p className="text-sm text-muted-foreground">No reviews scheduled.</p> : (
                  <ul className="m-0 list-none space-y-2 p-0">
                    {reviews.map((k) => {
                      const due = new Date(k.nextReviewAt!)
                      return (
                        <li key={k.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                          <span className="flex items-center gap-2"><CalendarClock className="h-4 w-4 text-brand" />{k.kcName}</span>
                          <span className={cn(due.getTime() < Date.now() ? 'font-medium text-destructive' : 'text-muted-foreground')}>{due.getTime() < Date.now() ? 'Due now' : due.toLocaleDateString('en-US', { dateStyle: 'medium' })}</span>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </section>
              <section className="rounded-lg border bg-card p-4">
                <h2 className="mt-0 text-lg font-semibold">Subject competency</h2>
                {competencies.length === 0 ? <p className="text-sm text-muted-foreground">No competency data yet.</p> : (
                  <ul className="m-0 list-none space-y-2 p-0">
                    {competencies.map((c) => (
                      <li key={c.id} className="flex justify-between rounded-md border p-3 text-sm">
                        <span>{c.subjectName}</span><span className="text-muted-foreground">Ability {c.abilityScore.toFixed(2)} · {c.quizzesTaken} quizzes</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          )
        }}
      </AsyncView>
    </div>
  )
}

export default MasteryPage
