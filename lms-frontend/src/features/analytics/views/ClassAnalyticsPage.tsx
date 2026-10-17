import { AsyncView } from '@shared/components/AsyncView'
import { EmptyState } from '@shared/components/EmptyState'
import { PageHeader } from '@shared/components/PageHeader'
import { toAsyncState } from '@shared/utils/async-state'
import { ClassSelect, useClassSelection } from '@features/courses'
import { useClassAnalytics } from '../hooks/useClassAnalytics'
import { Bar } from '@shared/components/Bar'
import { masteryTone } from '@shared/utils/mastery-tone'
import { Card } from '@shared/components/ui/card'
import { StatCard } from '@shared/components/StatCard'

const ClassAnalyticsPage = () => {
  const { classes, classId, setClassId } = useClassSelection()
  const state = toAsyncState(useClassAnalytics(classId))

  return (
    <div>
      <PageHeader title="Class Analytics" subtitle="Scores, knowledge component mastery and engagement" actions={classes.data && <ClassSelect classes={classes.data} value={classId} onChange={setClassId} />} />
      <AsyncView state={state} empty={<EmptyState title="No analytics yet" description="Data appears once students start submitting work." />}>
        {(a) => {
          const maxCount = Math.max(...a.scoreDistribution.map((d) => d.count))
          const maxActive = Math.max(...a.weeklyActivity.map((w) => w.active))
          const weakest = [...a.kcStats].sort((x, y) => x.avgMastery - y.avgMastery)[0]
          return (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <StatCard label="Average score" value={a.avgScore.toFixed(1)} hint="Out of 10" />
                <StatCard label="Completion rate" value={`${a.completionRate}%`} />
                <StatCard label="Weakest KC" value={weakest?.kcName ?? '—'} hint={weakest ? `${Math.round(weakest.avgMastery * 100)}% avg. mastery` : undefined} />
              </div>
              <div className="grid gap-6 lg:grid-cols-2">
                <Card title="Score distribution">
                  <div className="flex h-48 items-end gap-4">
                    {a.scoreDistribution.map((d) => (
                      <div key={d.range} className="flex flex-1 flex-col items-center gap-1">
                        <span className="text-xs font-medium">{d.count}</span>
                        <div className="w-full rounded-t-md bg-primary" style={{ height: `${(d.count / maxCount) * 140}px` }} />
                        <span className="text-xs text-muted-foreground">{d.range}</span>
                      </div>
                    ))}
                  </div>
                </Card>
                <Card title="Weekly active students">
                  <div className="flex h-48 items-end gap-3">
                    {a.weeklyActivity.map((w) => (
                      <div key={w.week} className="flex flex-1 flex-col items-center gap-1">
                        <span className="text-xs font-medium">{w.active}</span>
                        <div className="w-full rounded-t-md bg-primary/60" style={{ height: `${(w.active / maxActive) * 140}px` }} />
                        <span className="text-xs text-muted-foreground">{w.week}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
              <Card title="Knowledge component mastery (class average)">
                <ul className="m-0 list-none space-y-3 p-0">
                  {a.kcStats.map((k) => (
                    <li key={k.kcId} className="grid grid-cols-[10rem_1fr_3rem] items-center gap-3 text-sm">
                      <span className="truncate">{k.kcName}</span>
                      <Bar value={k.avgMastery * 100} className={masteryTone(k.avgMastery)} />
                      <span className="text-right text-xs">{Math.round(k.avgMastery * 100)}%</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          )
        }}
      </AsyncView>
    </div>
  )
}

export default ClassAnalyticsPage
