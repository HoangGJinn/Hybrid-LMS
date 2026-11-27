import { useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import { CheckCircle2, XCircle } from 'lucide-react';
import { AsyncView } from '@shared/components/AsyncView';
import { EmptyState } from '@shared/components/EmptyState';
import { Button } from '@shared/components/ui/button';
import { toAsyncState } from '@shared/utils/async-state';
import { cn } from '@shared/utils/cn';
import { FillBlankInput } from '../components/FillBlankInput';
import { QuestionFitBadge } from '../components/QuestionFitBadge';
import { QuizResultView } from '../components/QuizResultView';
import { useAnswerQuestion } from '../hooks/useAnswerQuestion';
import { useQuiz } from '../hooks/useQuiz';
import { useSubmitQuiz } from '../hooks/useSubmitQuiz';
import type { Quiz } from '../types/quizzes.types';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

/** Shows the "____" of a fill-in-the-blank question as a visible gap. */
const QuestionText = ({ text }: { text: string }) => (
  <>
    {text.split(/(_{3,})/).map((part, i) =>
      /^_{3,}$/.test(part) ? (
        <span
          key={i}
          aria-label="blank"
          className="mx-1 inline-block w-20 border-b-2 border-primary align-baseline"
        />
      ) : (
        <span key={i}>{part}</span>
      ),
    )}
  </>
);

const QuizPage = () => {
  const { courseId = '', quizId = '' } = useParams();
  const state = toAsyncState(useQuiz(quizId));
  return (
    <AsyncView
      state={state}
      empty={
        <EmptyState
          title="Quiz not found"
          action={<Link to="/student/courses">Back to My Courses</Link>}
        />
      }
    >
      {(quiz) =>
        quiz.status === 'SUBMITTED' ? (
          <QuizResultView quizId={quiz.id} courseId={courseId} />
        ) : (
          <QuizRunner key={quiz.id} quiz={quiz} courseId={courseId} />
        )
      }
    </AsyncView>
  );
};

const QuizRunner = ({ quiz, courseId }: { quiz: Quiz; courseId: string }) => {
  const answerQuestion = useAnswerQuestion(quiz.id);
  const submitQuiz = useSubmitQuiz();

  const firstOpen = quiz.questions.findIndex((q) => !q.answer);
  const [current, setCurrent] = useState(firstOpen === -1 ? 0 : firstOpen);
  const [picked, setPicked] = useState<string | null>(null);
  const [typed, setTyped] = useState('');
  const shownAt = useRef(Date.now());

  const total = quiz.questions.length;
  const question = quiz.questions[current];
  if (!question) {
    return <EmptyState title="This quiz has no questions" />;
  }

  const answer = question.answer;
  const isFill = question.type === 'FILL_BLANK';
  const last = current === total - 1;
  const unanswered = total - quiz.answeredCount;
  const selectedId = answer?.selectedOptionId ?? picked;
  const canCheck = isFill ? typed.trim() !== '' : picked !== null;

  const goTo = (index: number) => {
    setCurrent(index);
    setPicked(null);
    setTyped('');
    shownAt.current = Date.now();
  };

  const check = () => {
    if (!canCheck || answerQuestion.isPending) return;
    answerQuestion.mutate({
      quizInstanceQuestionId: question.id,
      ...(isFill ? { answerText: typed.trim() } : { selectedOptionId: picked! }),
      timeSpentSeconds: Math.min(
        3600,
        Math.round((Date.now() - shownAt.current) / 1000),
      ),
    });
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <header className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Practice quiz
          </div>
          <div className="truncate text-base font-semibold">{quiz.title}</div>
        </div>
        <div className="w-full max-w-xs">
          <div className="flex justify-between text-xs font-semibold text-muted-foreground">
            <span>
              Question {current + 1} of {total}
            </span>
            <span>{quiz.answeredCount} answered</span>
          </div>
          <div className="mt-2 h-2 rounded bg-muted">
            <div
              className="h-2 rounded bg-primary"
              style={{ width: `${(quiz.answeredCount / total) * 100}%` }}
            />
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
        <section className="space-y-4">
          <div className="space-y-5 rounded-lg border bg-card p-6">
            <div className="flex flex-wrap gap-2">
              {question.knowledgeComponents.map((kc) => (
                <span key={kc.kcId} className="rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-brand">
                  {kc.name}
                </span>
              ))}
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium capitalize">
                {question.difficulty.toLowerCase()}
              </span>
              <QuestionFitBadge fit={question.fit} />
              {isFill && (
                <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
                  Fill in the blank
                </span>
              )}
            </div>

            <h1 id="question" className="m-0 text-xl font-semibold leading-snug">
              <QuestionText text={question.questionText} />
            </h1>

            {isFill ? (
              <FillBlankInput
                key={question.id}
                value={answer?.answerText ?? typed}
                onChange={setTyped}
                onSubmit={check}
                disabled={!!answer}
                correct={answer ? answer.isCorrect : null}
              />
            ) : (
              <div role="group" aria-labelledby="question" className="space-y-3">
                {question.options.map((opt, i) => {
                  const selected = selectedId === opt.id;
                  const correct = !!answer && opt.id === answer.correctOptionId;
                  const wrong = !!answer && selected && !answer.isCorrect;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={!!answer}
                      aria-pressed={selected}
                      onClick={() => setPicked(opt.id)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-lg border-2 bg-card p-3 text-left text-base',
                        !answer && 'cursor-pointer hover:border-primary/50',
                        selected && !answer && 'border-primary bg-primary/10',
                        correct && 'border-success bg-success/10',
                        wrong && 'border-destructive bg-destructive/5',
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-sm font-bold',
                          selected && !answer && 'bg-primary text-primary-foreground',
                          correct && 'bg-success text-white',
                          wrong && 'bg-destructive text-white',
                        )}
                      >
                        {LETTERS[i] ?? i + 1}
                      </span>
                      <span className="flex-1">{opt.text}</span>
                      {correct && <CheckCircle2 className="h-5 w-5 text-success" />}
                      {wrong && <XCircle className="h-5 w-5 text-destructive" />}
                    </button>
                  );
                })}
              </div>
            )}

            {answer && (
              <div
                role="status"
                className={cn(
                  'rounded-lg border p-4 text-sm',
                  answer.isCorrect
                    ? 'border-success/40 bg-success/10'
                    : 'border-destructive/40 bg-destructive/5',
                )}
              >
                <div className="font-bold">
                  {answer.isCorrect ? 'Correct' : 'Not quite'}
                </div>
                {!answer.isCorrect && isFill && answer.correctAnswers.length > 0 && (
                  <p className="mb-0 mt-1">
                    Accepted answer{answer.correctAnswers.length > 1 ? 's' : ''}:{' '}
                    <strong>{answer.correctAnswers.join(' / ')}</strong>
                  </p>
                )}
                {answer.explanation && (
                  <p className="mb-0 mt-1 text-muted-foreground">{answer.explanation}</p>
                )}
              </div>
            )}
            {answerQuestion.isError && (
              <p className="m-0 text-sm text-destructive">
                Could not save your answer. Please try again.
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              disabled={current === 0}
              onClick={() => goTo(current - 1)}
              className="h-11 rounded-md border px-5 text-sm font-medium disabled:opacity-50"
            >
              Previous
            </button>

            <div className="flex items-center gap-3">
              {submitQuiz.isError && (
                <span className="text-sm text-destructive">Submission failed. Try again.</span>
              )}
              {!answer ? (
                <Button disabled={!canCheck || answerQuestion.isPending} onClick={check}>
                  {answerQuestion.isPending ? 'Checking…' : 'Check answer'}
                </Button>
              ) : last ? (
                <Button disabled={submitQuiz.isPending} onClick={() => submitQuiz.mutate(quiz.id)}>
                  {submitQuiz.isPending ? 'Submitting…' : 'Finish quiz'}
                </Button>
              ) : (
                <Button onClick={() => goTo(current + 1)}>Next question</Button>
              )}
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-lg border bg-card p-5">
            <h2 className="m-0 mb-3 text-sm font-bold">Questions</h2>
            <div className="grid grid-cols-5 gap-2">
              {quiz.questions.map((q, i) => (
                <button
                  key={q.id}
                  type="button"
                  aria-label={`Question ${i + 1}${q.answer ? (q.answer.isCorrect ? ', correct' : ', incorrect') : ''}`}
                  aria-current={i === current ? 'step' : undefined}
                  onClick={() => goTo(i)}
                  className={cn(
                    'h-10 rounded-md border-2 text-sm font-semibold',
                    q.answer?.isCorrect === true && 'border-success bg-success/10',
                    q.answer?.isCorrect === false && 'border-destructive bg-destructive/5',
                    !q.answer && 'border-border bg-muted/40 text-muted-foreground',
                    i === current && 'border-primary bg-card text-brand',
                  )}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-3 rounded-lg border bg-card p-5">
            {quiz.adaptive && (
              <p className="m-0 text-xs text-muted-foreground">
                These questions were picked to match your level. The tag on each
                one shows how hard it should feel for you.
              </p>
            )}
            <p className="m-0 text-xs text-muted-foreground">
              You see the answer after each question. Progress is saved if you leave.
            </p>
            <button
              type="button"
              disabled={quiz.answeredCount === 0 || submitQuiz.isPending}
              onClick={() => submitQuiz.mutate(quiz.id)}
              className="h-10 w-full rounded-md border text-sm font-medium disabled:opacity-50"
            >
              Finish now
            </button>
            {unanswered > 0 && quiz.answeredCount > 0 && (
              <p className="m-0 text-xs text-muted-foreground">
                {unanswered} unanswered will count as wrong.
              </p>
            )}
          </section>
          <Link to={`/student/courses/${courseId}`} className="block text-center text-sm text-muted-foreground no-underline">
            Leave quiz
          </Link>
        </aside>
      </div>
    </div>
  );
};

export default QuizPage;