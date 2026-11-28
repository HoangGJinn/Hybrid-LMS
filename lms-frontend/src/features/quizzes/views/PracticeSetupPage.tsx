import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { AsyncView } from '@shared/components/AsyncView';
import { EmptyState } from '@shared/components/EmptyState';
import { Button } from '@shared/components/ui/button';
import { toAsyncState } from '@shared/utils/async-state';
import { cn } from '@shared/utils/cn';
import { useCreateQuiz } from '../hooks/useCreateQuiz';
import { usePracticeInfo } from '../hooks/usePracticeInfo';
import { MasteryBar } from '../components/MasteryBar';
import type { PracticeInfo, QuizFocus, QuizSize } from '../types/quizzes.types';

const SIZES: QuizSize[] = [5, 10, 15];
const FOCUS_OPTIONS: { value: QuizFocus; title: string; text: string }[] = [
  {
    value: 'WEAK',
    title: 'My weaker topics',
    text: 'More questions on topics you know less, fewer on what you already know.',
  },
  {
    value: 'EVEN',
    title: 'All topics evenly',
    text: 'A balanced review of everything in this document.',
  },
];

const PracticeSetupPage = () => {
  const { courseId = '', docId = '' } = useParams();
  const state = toAsyncState(usePracticeInfo(courseId, docId));
  return (
    <AsyncView
      state={state}
      empty={
        <EmptyState
          title="Document not found"
          action={<Link to={`/student/courses/${courseId}`}>Back to course</Link>}
        />
      }
    >
      {(info) => <SetupForm info={info} courseId={courseId} docId={docId} />}
    </AsyncView>
  );
};

const SetupForm = ({
  info,
  courseId,
  docId,
}: {
  info: PracticeInfo;
  courseId: string;
  docId: string;
}) => {
  const navigate = useNavigate();
  const createQuiz = useCreateQuiz();
  const [size, setSize] = useState<QuizSize>(10);
  const [focus, setFocus] = useState<QuizFocus>('WEAK');
  const noTopics = info.kcs.length === 0;
  // The topics that get extra questions with the "weaker topics" focus, weakest first.
  const weakest = info.kcs
    .filter((k) => k.level === 'WEAK' || k.level === 'UNSURE')
    .sort((a, b) => (a.mastery ?? 0) - (b.mastery ?? 0))
    .slice(0, 3);
  const modelBased = info.kcs.some((k) => k.source === 'enas');

  const start = () =>
    createQuiz.mutate(
      {
        subjectId: info.subjectId,
        kcIds: noTopics ? undefined : info.kcs.map((k) => k.kcId),
        numQuestions: size,
        focus,
        title: `Practice: ${info.documentTitle}`,
      },
      {
        onSuccess: (quiz) =>
          navigate(`/student/courses/${courseId}/quizzes/${quiz.id}`),
      },
    );

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        to={`/student/courses/${courseId}/documents/${docId}`}
        className="text-sm text-muted-foreground no-underline"
      >
        ← Back to document
      </Link>

      <section className="space-y-7 rounded-lg border bg-card p-6">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-brand">
            Practice quiz
          </div>
          <h1 className="mb-0 mt-1 text-2xl font-bold">{info.documentTitle}</h1>
          <p className="mb-0 mt-2 text-sm text-muted-foreground">
            Questions come from the topics in this document. Nothing here
            affects your grade.
          </p>
        </div>

        <fieldset className="m-0 border-0 p-0">
          <legend className="mb-3 p-0 text-sm font-semibold">How many questions?</legend>
          <div className="flex flex-wrap gap-2">
            {SIZES.map((n) => (
              <button
                key={n}
                type="button"
                aria-pressed={size === n}
                onClick={() => setSize(n)}
                className={cn(
                  'h-11 w-24 rounded-md border-2 text-sm font-semibold',
                  size === n
                    ? 'border-primary bg-primary/15 text-brand'
                    : 'border-border bg-card',
                )}
              >
                {n}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="m-0 border-0 p-0">
          <legend className="mb-3 p-0 text-sm font-semibold">What should it focus on?</legend>
          <div className="space-y-2">
            {FOCUS_OPTIONS.map((o) => (
              <label
                key={o.value}
                className={cn(
                  'flex cursor-pointer items-start gap-3 rounded-lg border-2 p-4',
                  focus === o.value ? 'border-primary bg-primary/10' : 'border-border',
                )}
              >
                <input
                  type="radio"
                  name="focus"
                  className="mt-1"
                  checked={focus === o.value}
                  onChange={() => setFocus(o.value)}
                />
                <span>
                  <span className="block text-sm font-semibold">{o.title}</span>
                  <span className="mt-1 block text-sm text-muted-foreground">{o.text}</span>
                  {o.value === 'WEAK' && focus === 'WEAK' && !noTopics && (
                    <span className="mt-2 block text-sm text-brand">
                      {weakest.length > 0
                        ? `Extra questions on: ${weakest.map((k) => k.name).join(', ')}.`
                        : 'You are doing well on every topic here, so the mix will stay fairly even.'}
                    </span>
                  )}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <div className="mb-2 text-sm font-semibold">Topics included</div>
          {noTopics ? (
            <p className="m-0 text-sm text-muted-foreground">
              Topics for this document are not ready yet, so questions come
              from the whole subject.
            </p>
          ) : (
            <div className="space-y-4">
              {info.kcs.map((kc) => (
                <MasteryBar
                  key={kc.kcId}
                  label={kc.name}
                  value={kc.mastery}
                  level={kc.level}
                  confidence={kc.confidence}
                />
              ))}
              {modelBased && (
                <p className="m-0 text-xs text-muted-foreground">
                  Levels are predicted by a learning model from your past answers.
                  Questions are picked that you have a fair chance, not a sure
                  thing, of getting right.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-5">
          <div className="text-sm text-muted-foreground">
            <strong className="text-foreground">{size} questions</strong> · answers are saved as you go
          </div>
          <Button disabled={createQuiz.isPending} onClick={start}>
            {createQuiz.isPending ? 'Creating…' : 'Start quiz'}
          </Button>
        </div>
        {createQuiz.isError && (
          <p className="m-0 text-sm text-destructive">
            Could not create the quiz. There may be no questions for these
            topics yet.
          </p>
        )}
      </section>
    </div>
  );
};

export default PracticeSetupPage;
