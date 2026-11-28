import { CalendarClock, TrendingDown, TrendingUp } from 'lucide-react';
import { AsyncView } from '@shared/components/AsyncView';
import { EmptyState } from '@shared/components/EmptyState';
import { PageHeader } from '@shared/components/PageHeader';
import { toAsyncState } from '@shared/utils/async-state';
import { cn } from '@shared/utils/cn';
import { useMasteryOverview } from '../hooks/useMastery';
import RadarChart from '../components/RadarChart';

const level = (p: number) =>
  p >= 0.7
    ? { label: 'Mastered', cls: 'bg-emerald-500' }
    : p >= 0.4
      ? { label: 'Developing', cls: 'bg-amber-500' }
      : { label: 'Needs review', cls: 'bg-destructive' };

/** Change since the previous update, in percentage points; null when there is nothing to compare with. */
const delta = (now: number, prev: number | null) =>
  prev === null ? null : Math.round((now - prev) * 100);

const MasteryPage = () => {
  const state = toAsyncState(useMasteryOverview());
  return (
    <div>
      <PageHeader title="Knowledge Mastery" />
      <AsyncView
        state={state}
        isEmpty={(d) => d.kcs.length === 0}
        empty={
          <EmptyState
            title="No mastery data yet"
            description="Complete a quiz to start tracking your mastery."
          />
        }
      >
        {({ kcs, competencies }) => {
          const reviews = kcs
            .filter((k) => k.nextReviewAt)
            .sort(
              (a, b) => +new Date(a.nextReviewAt!) - +new Date(b.nextReviewAt!),
            );
          return (
            <div className="grid gap-6 lg:grid-cols-2">
              <details className="rounded-lg border bg-card p-4 text-sm lg:col-span-2">
                <summary className="cursor-pointer font-medium">
                  How is mastery calculated?
                </summary>
                <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted-foreground">
                  <li>
                    The ENAS-KT model reads your last answers (up to 99) and
                    predicts the chance you answer each question of a topic
                    correctly.
                  </li>
                  <li>
                    A topic&apos;s mastery is the average of those chances over
                    a sample of up to 30 of its questions.
                  </li>
                  <li>
                    It is saved each time you submit a quiz, so the change
                    shown is always between two consecutive updates.
                  </li>
                  <li>
                    Subject ability is the average mastery of the topics you
                    practised in that subject (0–100).
                  </li>
                  <li>
                    The next review comes after 1, 3 or 7 days for topics under
                    40%, 60% or 80%, and grows with each good review for
                    stronger topics.
                  </li>
                </ol>
              </details>
              <section className="flex flex-col items-center rounded-lg border bg-card p-4">
                <h2 className="mt-0 self-start text-lg font-semibold">
                  Mastery overview
                </h2>
                {kcs.length >= 3 ? (
                  <RadarChart
                    data={kcs.map((k) => ({
                      label: k.kcName,
                      value: k.pMastery,
                    }))}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    At least 3 KCs are needed for the radar view.
                  </p>
                )}
              </section>
              <section className="rounded-lg border bg-card p-4">
                <h2 className="mt-0 text-lg font-semibold">
                  Knowledge components
                </h2>
                <ul className="m-0 list-none space-y-3 p-0">
                  {[...kcs]
                    .sort((a, b) => a.pMastery - b.pMastery)
                    .map((k) => {
                      const l = level(k.pMastery);
                      return (
                        <li key={k.id}>
                          <div className="flex justify-between text-sm">
                            <span className="font-medium">{k.kcName}</span>
                            <span className="text-muted-foreground">
                              {Math.round(k.pMastery * 100)}% · {l.label}
                            </span>
                          </div>
                          <div className="mt-1 h-2 rounded bg-muted">
                            <div
                              className={cn('h-2 rounded', l.cls)}
                              style={{ width: `${k.pMastery * 100}%` }}
                            />
                          </div>
                          <p className="m-0 mt-1 flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
                            <span>
                              {k.attemptsCount} attempts · {k.correctCount} correct
                            </span>
                            {(() => {
                              const d = delta(k.pMastery, k.pPrev);
                              if (d === null || d === 0) return null;
                              const Icon = d > 0 ? TrendingUp : TrendingDown;
                              return (
                                <span
                                  className={cn(
                                    'inline-flex items-center gap-1',
                                    d > 0 ? 'text-emerald-600' : 'text-destructive',
                                  )}
                                >
                                  <Icon className="h-3 w-3" />
                                  {d > 0 ? '+' : ''}
                                  {d} pts since last update
                                </span>
                              );
                            })()}
                            <span>
                              {k.source === 'enas'
                                ? `ENAS · ${k.sampleSize} questions`
                                : 'Recent accuracy (model offline)'}
                            </span>
                          </p>
                        </li>
                      );
                    })}
                </ul>
              </section>
              <section className="rounded-lg border bg-card p-4">
                <h2 className="mt-0 text-lg font-semibold">Review schedule</h2>
                {reviews.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No reviews scheduled.
                  </p>
                ) : (
                  <ul className="m-0 list-none space-y-2 p-0">
                    {reviews.map((k) => {
                      const due = new Date(k.nextReviewAt!);
                      return (
                        <li
                          key={k.id}
                          className="flex items-center justify-between rounded-md border p-3 text-sm"
                        >
                          <span className="flex items-center gap-2">
                            <CalendarClock className="h-4 w-4 text-brand" />
                            {k.kcName}
                          </span>
                          <span
                            className={cn(
                              due.getTime() < Date.now()
                                ? 'font-medium text-destructive'
                                : 'text-muted-foreground',
                            )}
                          >
                            {due.getTime() < Date.now()
                              ? 'Due now'
                              : due.toLocaleDateString('en-US', {
                                  dateStyle: 'medium',
                                })}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
              <section className="rounded-lg border bg-card p-4">
                <h2 className="mt-0 text-lg font-semibold">
                  Subject competency
                </h2>
                {competencies.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No competency data yet.
                  </p>
                ) : (
                  <ul className="m-0 list-none space-y-2 p-0">
                    {competencies.map((c) => (
                      <li
                        key={c.id}
                        className="flex justify-between rounded-md border p-3 text-sm"
                      >
                        <span>{c.subjectName}</span>
                        <span className="text-muted-foreground">
                          Ability {c.abilityScore.toFixed(2)} · {c.quizzesTaken}{' '}
                          quizzes
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          );
        }}
      </AsyncView>
    </div>
  );
};

export default MasteryPage;
