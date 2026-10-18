import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import { toast } from 'sonner';
import { Flag } from 'lucide-react';
import { AsyncView } from '@shared/components/AsyncView';
import { EmptyState } from '@shared/components/EmptyState';
import { PageHeader } from '@shared/components/PageHeader';
import { Button } from '@shared/components/ui/button';
import { toAsyncState } from '@shared/utils/async-state';
import { pad } from '@shared/utils/format';
import { useCountdown } from '@shared/hooks/useCountdown';
import { cn } from '@shared/utils/cn';
import { useExamRoom } from '../hooks/useExamRoom';
import { useSubmitExamSession } from '../hooks/useExamSession';
import type { ExamSchedule, ExamSession } from '../types/exams.types';
import type { QuizQuestion } from '@features/quizzes';
import { readStoredJson } from '@shared/utils/storage';
import QuestionPalette from '../components/QuestionPalette';
import SubmitReviewDialog from '../components/SubmitReviewDialog';

const ExamRoomPage = () => {
  const { examId = '' } = useParams();
  const state = toAsyncState(useExamRoom(examId));
  return (
    <AsyncView
      state={state}
      empty={
        <EmptyState
          title="Exam not found"
          action={<Link to="/student/exams">Back to Exams</Link>}
        />
      }
    >
      {(d) => <Room key={d.session.id} {...d} />}
    </AsyncView>
  );
};

const isTypingTarget = (target: EventTarget | null) =>
  target instanceof HTMLTextAreaElement ||
  target instanceof HTMLSelectElement ||
  (target instanceof HTMLInputElement &&
    target.type !== 'radio' &&
    target.type !== 'checkbox');

const Room = ({
  exam,
  questions,
  session,
}: {
  exam: ExamSchedule;
  questions: QuizQuestion[];
  session: ExamSession;
}) => {
  const draftKey = `exam-draft-${exam.id}`;
  const flagsKey = `${draftKey}-flags`;
  const duration = +new Date(exam.endTime) - +new Date(exam.startTime);
  const [deadline] = useState(() => {
    const saved = localStorage.getItem(`${draftKey}-deadline`);
    const d = saved ? Number(saved) : Date.now() + duration;
    localStorage.setItem(`${draftKey}-deadline`, String(d));
    return d;
  });
  const [answers, setAnswers] = useState<Record<string, number>>(() =>
    readStoredJson(draftKey, {}),
  );
  const [flags, setFlags] = useState<Record<string, boolean>>(() =>
    readStoredJson(flagsKey, {}),
  );
  const [current, setCurrent] = useState(0);
  const [result, setResult] = useState<ExamSession | null>(null);
  const { mutate: submitSession, isPending: submitting } =
    useSubmitExamSession();
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const cd = useCountdown(deadline);
  const submitted = useRef(false);
  const currentQuestionId = questions[current]?.id;

  useEffect(() => {
    localStorage.setItem(draftKey, JSON.stringify(answers));
  }, [answers, draftKey]);
  useEffect(() => {
    localStorage.setItem(flagsKey, JSON.stringify(flags));
  }, [flags, flagsKey]);

  const toggleFlag = useCallback(
    (questionId: string) =>
      setFlags((f) => ({ ...f, [questionId]: !f[questionId] })),
    [],
  );

  // "F" toggles the flag of the current question (radios keep their native arrow-key behaviour).
  useEffect(() => {
    if (!currentQuestionId) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key.toLowerCase() !== 'f' ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        isTypingTarget(event.target)
      )
        return;
      toggleFlag(currentQuestionId);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentQuestionId, toggleFlag]);

  const submit = useCallback(() => {
    if (submitted.current) return;
    submitted.current = true;
    submitSession(
      {
        sessionId: session.id,
        answers: Object.entries(answers).map(([questionId, selectedIndex]) => ({
          questionId,
          selectedIndex,
        })),
      },
      {
        onSuccess: (res) => {
          localStorage.removeItem(draftKey);
          localStorage.removeItem(`${draftKey}-deadline`);
          localStorage.removeItem(flagsKey);
          setIsReviewOpen(false);
          setResult(res);
          toast.success('Exam submitted');
        },
        onError: () => {
          submitted.current = false;
          toast.error('Could not submit the exam. Please try again.');
        },
      },
    );
  }, [answers, draftKey, flagsKey, session.id, submitSession]);

  useEffect(() => {
    if (cd.expired) submit();
  }, [cd.expired, submit]);

  const handleJump = (index: number) => {
    setCurrent(index);
    setIsReviewOpen(false);
  };

  if (result)
    return (
      <div className="mx-auto max-w-lg rounded-lg border bg-card p-8 text-center">
        <h1 className="mt-0 text-2xl font-bold">Exam submitted</h1>
        <p className="text-muted-foreground">
          Your answers for {exam.examName} have been recorded. Results will be
          published by your lecturer.
        </p>
        <Button asChild>
          <Link to="/student/exams">Back to Exams</Link>
        </Button>
      </div>
    );

  if (questions.length === 0)
    return <EmptyState title="This exam has no questions" />;
  const q = questions[current];
  const answered = Object.keys(answers).length;
  const flaggedCount = questions.filter((x) => flags[x.id]).length;
  const low = cd.ms < 5 * 60 * 1000;

  return (
    <div>
      <PageHeader
        title={exam.examName}
        subtitle={`${answered}/${questions.length} answered · ${flaggedCount} flagged · draft auto-saved`}
        actions={
          <div
            role="timer"
            aria-label="Time remaining"
            className={cn(
              'rounded-md border px-4 py-2 font-mono text-xl font-bold',
              low ? 'border-destructive text-destructive' : 'text-brand',
            )}
          >
            {pad(cd.hours + cd.days * 24)}:{pad(cd.minutes)}:{pad(cd.seconds)}
          </div>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="rounded-lg border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Question {current + 1} of {questions.length}
            </span>
            <Button
              variant="outline"
              size="sm"
              aria-pressed={Boolean(flags[q.id])}
              title="Shortcut: F"
              onClick={() => toggleFlag(q.id)}
            >
              <Flag
                className={cn(
                  'h-4 w-4',
                  flags[q.id] && 'fill-warning text-warning',
                )}
              />
              {flags[q.id] ? 'Flagged' : 'Flag for review'}
            </Button>
          </div>
          <p className="mt-0 font-medium">{q.content}</p>
          <div className="space-y-2">
            {q.options.map((opt, oi) => (
              <label
                key={oi}
                className={cn(
                  'flex cursor-pointer items-center gap-3 rounded-md border p-3 text-sm',
                  answers[q.id] === oi && 'border-primary bg-primary/15',
                )}
              >
                <input
                  type="radio"
                  name={q.id}
                  checked={answers[q.id] === oi}
                  onChange={() => setAnswers((a) => ({ ...a, [q.id]: oi }))}
                />
                {opt}
              </label>
            ))}
          </div>
          <div className="mt-5 flex justify-between">
            <Button
              variant="outline"
              disabled={current === 0}
              onClick={() => setCurrent((c) => c - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              disabled={current === questions.length - 1}
              onClick={() => setCurrent((c) => c + 1)}
            >
              Next
            </Button>
          </div>
        </div>
        <aside className="h-fit rounded-lg border bg-card p-4">
          <QuestionPalette
            questions={questions}
            answers={answers}
            flags={flags}
            current={current}
            onSelect={setCurrent}
          />
          <Button
            className="mt-4 w-full"
            disabled={submitting}
            onClick={() => setIsReviewOpen(true)}
          >
            Review &amp; submit
          </Button>
        </aside>
      </div>
      <SubmitReviewDialog
        open={isReviewOpen}
        questions={questions}
        answers={answers}
        flags={flags}
        isSubmitting={submitting}
        onClose={() => setIsReviewOpen(false)}
        onJump={handleJump}
        onConfirm={submit}
      />
    </div>
  );
};

export default ExamRoomPage;
