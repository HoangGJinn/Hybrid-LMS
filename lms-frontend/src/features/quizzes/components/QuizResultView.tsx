import { Link } from 'react-router';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { AsyncView } from '@shared/components/AsyncView';
import { EmptyState } from '@shared/components/EmptyState';
import { toAsyncState } from '@shared/utils/async-state';
import { useQuizResult } from '../hooks/useQuizResult';
import type { QuizResult } from '../types/quizzes.types';
import { MasteryBar } from './MasteryBar';
import { FIT_HINT, FIT_LABEL, FIT_ORDER, FIT_TONE } from './mastery-display';
import { cn } from '@shared/utils/cn';

const RING_RADIUS = 60;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

/** "45s", "3m 12s", "1h 05m". */
const formatDuration = (from: string, to: string | null): string | null => {
  if (!to) return null;
  const seconds = Math.max(0, Math.round((new Date(to).getTime() - new Date(from).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${String(seconds % 60).padStart(2, '0')}s`;
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`;
};

export const QuizResultView = ({
  quizId,
  courseId,
}: {
  quizId: string;
  courseId: string;
}) => {
  const state = toAsyncState(useQuizResult(quizId));
  return (
    <AsyncView state={state} empty={<EmptyState title="Result not found" />}>
      {(result) => <ResultBody result={result} courseId={courseId} />}
    </AsyncView>
  );
};

const ResultBody = ({
  result,
  courseId,
}: {
  result: QuizResult;
  courseId: string;
}) => {
  const { quiz, kcBreakdown } = result;
  const correct = quiz.correctCount ?? 0;
  const pct = Math.round(quiz.score ?? 0);
  const duration = formatDuration(quiz.createdAt, quiz.submittedAt);
  const missed = quiz.questions.filter((q) => q.answer?.isCorrect !== true);
  // How the student did on warm-up, good-fit and challenge questions (only for model-picked quizzes).
  const byFit = FIT_ORDER.map((fit) => {
    const qs = quiz.questions.filter((q) => q.fit === fit);
    return { fit, total: qs.length, correct: qs.filter((q) => q.answer?.isCorrect === true).length };
  }).filter((g) => g.total > 0);
  const modelBased = kcBreakdown.some((k) => k.source === 'enas');
  // const optionText = (q: (typeof quiz.questions)[number], id: string | null) =>
  //   q.options.find((o) => o.id === id)?.text ?? 'No answer';

  const yourAnswer = (q: (typeof quiz.questions)[number]): string =>
    q.type === 'FILL_BLANK'
      ? q.answer?.answerText || 'No answer'
      : (q.options.find((o) => o.id === q.answer?.selectedOptionId)?.text ?? 'No answer');

  const correctAnswer = (q: (typeof quiz.questions)[number]): string =>
    q.type === 'FILL_BLANK'
      ? (q.answer?.correctAnswers.join(' / ') ?? '')
      : (q.options.find((o) => o.id === q.answer?.correctOptionId)?.text ?? '');

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section className="flex flex-wrap items-center gap-8 rounded-lg border bg-card p-6">
        <div
          className="relative h-36 w-36 shrink-0"
          role="img"
          aria-label={`Score ${correct} out of ${quiz.numQuestions}, ${pct} percent`}
        >
          <svg width="144" height="144" viewBox="0 0 140 140" aria-hidden="true">
            <circle cx="70" cy="70" r={RING_RADIUS} fill="none" strokeWidth="12" className="stroke-muted" />
            <circle
              cx="70"
              cy="70"
              r={RING_RADIUS}
              fill="none"
              strokeWidth="12"
              strokeLinecap="round"
              className="stroke-success"
              strokeDasharray={`${(pct / 100) * RING_LENGTH} ${RING_LENGTH}`}
              transform="rotate(-90 70 70)"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center leading-tight">
            <span className="text-3xl font-bold">
              {correct}
              <span className="text-xl font-semibold text-muted-foreground">/{quiz.numQuestions}</span>
            </span>
            <span className="text-sm font-semibold text-muted-foreground">{pct}%</span>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="m-0 text-2xl font-bold">
            {pct >= 70 ? 'Good work' : 'Keep practising'}: {correct} of {quiz.numQuestions} correct
          </h1>
          <p className="mb-0 mt-2 text-sm text-muted-foreground">
            {quiz.title}
            {duration && <> · Time taken: <strong className="text-foreground">{duration}</strong></>}
          </p>
          <Link
            to={`/student/courses/${courseId}`}
            className="mt-4 inline-flex h-10 items-center rounded-md border px-4 text-sm font-medium text-foreground no-underline hover:border-primary"
          >
            Back to course
          </Link>
        </div>
      </section>

      {kcBreakdown.length > 0 && (
        <section className="space-y-5 rounded-lg border bg-card p-6">
          <h2 className="m-0 text-lg font-bold">How your topics changed</h2>
          {kcBreakdown.map((kc) => {
            const before = kc.masteryBefore === null ? null : Math.round(kc.masteryBefore * 100);
            const after = kc.masteryAfter === null ? null : Math.round(kc.masteryAfter * 100);
            return (
              <div key={kc.kcId}>
                <MasteryBar label={kc.name} value={kc.masteryAfter} />
                <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span>
                    {kc.correct} of {kc.total} correct
                    {before === null && after !== null ? ' · first attempt' : ''}
                  </span>
                  {before !== null && after !== null && before !== after && (
                    <span
                      className={cn(
                        'flex items-center gap-1 font-semibold',
                        after > before ? 'text-success' : 'text-destructive',
                      )}
                    >
                      · {after > before ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                      {before}% → {after}%
                    </span>
                  )}
                </div>
              </div>
            );
          })}
          {modelBased && (
            <p className="m-0 text-xs text-muted-foreground">
              Topic levels are predicted by a learning model from all your answers, so they can move even when
              you answer a topic correctly.
            </p>
          )}
        </section>
      )}

      {quiz.adaptive && byFit.length > 0 && (
        <section className="space-y-4 rounded-lg border bg-card p-6">
          <div>
            <h2 className="m-0 text-lg font-bold">How the questions matched you</h2>
            <p className="mb-0 mt-1 text-sm text-muted-foreground">
              Each question was picked for your level. Here is how you did on each kind.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {byFit.map((g) => (
              <div key={g.fit} className="rounded-lg border p-4">
                <span className={cn('rounded-full px-3 py-1 text-xs font-semibold', FIT_TONE[g.fit])}>
                  {FIT_LABEL[g.fit]}
                </span>
                <div className="mt-3 text-2xl font-bold">
                  {g.correct}
                  <span className="text-base font-semibold text-muted-foreground">/{g.total}</span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{FIT_HINT[g.fit]}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {missed.length > 0 && (
        <section className="rounded-lg border bg-card p-6">
          <h2 className="m-0 text-lg font-bold">Questions to review</h2>
          <p className="mb-4 mt-1 text-sm text-muted-foreground">
            {missed.length} you missed
          </p>
          <div className="space-y-3">
            {missed.map((q) => (
              <details key={q.id} className="rounded-lg border">
                <summary className="flex cursor-pointer items-center gap-3 p-4 text-sm font-semibold">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-destructive/10 text-xs font-bold text-destructive">
                    {q.orderIndex}
                  </span>
                  <span className="flex-1">{q.questionText}</span>
                </summary>
                <div className="space-y-2 px-4 pb-4 pl-14 text-sm">
                  <div>
                    <span className="font-semibold text-destructive">Your answer: </span>
                    {yourAnswer(q)}                  </div>
                  <div>
                    <span className="font-semibold text-success">Correct answer: </span>
                    {correctAnswer(q)}
                  </div>
                  {q.answer?.explanation && (
                    <p className="m-0 text-muted-foreground">{q.answer.explanation}</p>
                  )}
                </div>
              </details>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};