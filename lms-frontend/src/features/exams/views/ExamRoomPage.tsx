import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import { toast } from 'sonner';
import {
  AlertTriangle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Flag,
  Play,
  RefreshCw,
  RotateCcw,
  Trophy,
} from 'lucide-react';
import { AsyncView } from '@shared/components/AsyncView';
import { EmptyState } from '@shared/components/EmptyState';
import { PageHeader } from '@shared/components/PageHeader';
import { StatusBadge } from '@shared/components/ui/badge';
import { Button } from '@shared/components/ui/button';
import { toAsyncState } from '@shared/utils/async-state';
import { formatDateTime, pad } from '@shared/utils/format';
import { useCountdown } from '@shared/hooks/useCountdown';
import { cn } from '@shared/utils/cn';
import { readStoredJson } from '@shared/utils/storage';
import { useExamRoom } from '../hooks/useExamRoom';
import { useAttemptReview } from '../hooks/useExams';
import {
  useStartExamSession,
  useSubmitExamSession,
} from '../hooks/useExamSession';
import { useExamAutosave } from '../hooks/useExamAutosave';
import type {
  ExamAttempt,
  StudentExamLobby,
} from '../types/exams.types';
import QuestionPalette from '../components/QuestionPalette';
import SubmitReviewDialog from '../components/SubmitReviewDialog';
import { AttemptReviewViewer } from '../components/AttemptReviewViewer';
import { FileExamWorkspace } from '../components/FileExamWorkspace';
import { scoreTone } from '../utils/score-tone';

/** UTEx-style fixed 10-question batch per page. */
const QUESTIONS_PER_PAGE = 10;
const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

const ExamRoomPage = () => {
  const { courseId = '', examId = '' } = useParams();
  const lobbyQuery = useExamRoom(courseId, examId);
  const state = toAsyncState(lobbyQuery);
  const [activeAttempt, setActiveAttempt] = useState<ExamAttempt | null>(null);
  const [reviewSessionId, setReviewSessionId] = useState<string | null>(null);
  const startMutation = useStartExamSession();

  const handleStartOrResume = () => {
    startMutation.mutate(
      { classId: courseId, examId },
      {
        onSuccess: (attempt) => {
          setReviewSessionId(null);
          setActiveAttempt(attempt);
        },
        onError: (err) => toast.error(err.message),
      },
    );
  };

  if (activeAttempt) {
    if (activeAttempt.exam.format === 'FILE') {
      return (
        <FileExamWorkspace
          key={activeAttempt.session.id}
          attempt={activeAttempt}
          onExitToLobby={() => {
            setActiveAttempt(null);
            void lobbyQuery.refetch();
          }}
        />
      );
    }
    return (
      <ActiveAttemptRoom
        key={activeAttempt.session.id}
        attempt={activeAttempt}
        onSubmitted={(completedSessionId, canReview) => {
          setActiveAttempt(null);
          void lobbyQuery.refetch();
          if (canReview) setReviewSessionId(completedSessionId);
        }}
        onExitToLobby={() => {
          setActiveAttempt(null);
          void lobbyQuery.refetch();
        }}
      />
    );
  }

  if (reviewSessionId) {
    return (
      <AttemptReviewPanel
        sessionId={reviewSessionId}
        onBack={() => setReviewSessionId(null)}
      />
    );
  }

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
      {(lobby) => (
        <LobbyView
          lobby={lobby}
          isStarting={startMutation.isPending}
          onStartOrResume={handleStartOrResume}
          onReviewAttempt={(sessionId) => setReviewSessionId(sessionId)}
        />
      )}
    </AsyncView>
  );
};

const formatMinutes = (minutes: number): string => {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
};

const tookLabel = (startedAt: string, endedAt: string | null): string | null => {
  if (!endedAt) return null;
  const minutes = Math.max(
    1,
    Math.round((+new Date(endedAt) - +new Date(startedAt)) / 60_000),
  );
  return `took ${formatMinutes(minutes)}`;
};

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-baseline justify-between gap-4 py-2.5 text-sm">
    <dt className="text-muted-foreground">{label}</dt>
    <dd className="m-0 text-right font-medium">{value}</dd>
  </div>
);

const LobbyView = ({
  lobby,
  isStarting,
  onStartOrResume,
  onReviewAttempt,
}: {
  lobby: StudentExamLobby;
  isStarting: boolean;
  onStartOrResume: () => void;
  onReviewAttempt: (sessionId: string) => void;
}) => {
  const hasActive = lobby.activeSessionId !== null;
  const canAct = hasActive || lobby.canStartNewAttempt;
  const isFile = lobby.format === 'FILE';
  const attemptsLeft =
    lobby.maxAttempts === null ? null : lobby.maxAttempts - lobby.attemptsUsed;

  // What the student should know right now, per state.
  const headline = hasActive
    ? 'You have an attempt in progress'
    : lobby.canStartNewAttempt
      ? lobby.attemptsUsed === 0
        ? 'Ready to begin'
        : `Ready for attempt #${lobby.attemptsUsed + 1}`
      : lobby.status === 'UPCOMING'
        ? 'Not open yet'
        : lobby.status === 'CLOSED'
          ? 'This exam is closed'
          : 'No attempts left';
  const reason = hasActive
    ? 'Pick up where you left off. Your timer is still running.'
    : lobby.canStartNewAttempt
      ? isFile
        ? 'Download the paper, upload your files, and update them any time while the timer runs.'
        : 'Answers are saved automatically while you work.'
      : lobby.status === 'UPCOMING'
        ? `Opens ${formatDateTime(lobby.startTime)}.`
        : lobby.status === 'CLOSED'
          ? `Closed ${formatDateTime(lobby.endTime)}.`
          : 'You have used every attempt allowed for this exam.';

  const bestIndex =
    lobby.showResults && lobby.bestScore !== null
      ? lobby.attempts.findIndex((a) => a.score === lobby.bestScore)
      : -1;

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <PageHeader
        title={lobby.examName}
        subtitle={
          isFile
            ? 'File submission exam'
            : `${lobby.questionCount} multiple-choice questions`
        }
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={lobby.status} />
            <Button variant="outline" size="sm" asChild>
              <Link to={`/student/courses/${lobby.classId}/content`}>
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                Back to course
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <div className="space-y-5">
          {/* State + primary action + best score, in one place */}
          <section
            className={cn(
              'flex flex-wrap items-center justify-between gap-x-6 gap-y-4 rounded-lg border border-l-4 bg-card p-5',
              canAct
                ? 'border-l-primary'
                : lobby.status === 'UPCOMING'
                  ? 'border-l-warning'
                  : 'border-l-border',
            )}
          >
            <div className="min-w-0 flex-1 space-y-3">
              <div>
                <h2 className="m-0 text-lg font-semibold">{headline}</h2>
                <p className="m-0 mt-1 text-sm text-muted-foreground">
                  {reason}
                </p>
              </div>
              {canAct && (
                <Button disabled={isStarting} onClick={onStartOrResume}>
                  {hasActive ? (
                    <Play className="mr-1.5 h-4 w-4" />
                  ) : lobby.attemptsUsed > 0 ? (
                    <RotateCcw className="mr-1.5 h-4 w-4" />
                  ) : (
                    <Play className="mr-1.5 h-4 w-4" />
                  )}
                  {isStarting
                    ? 'Loading…'
                    : hasActive
                      ? 'Continue attempt'
                      : lobby.attemptsUsed > 0
                        ? `Retake (attempt #${lobby.attemptsUsed + 1})`
                        : 'Start exam'}
                </Button>
              )}
            </div>

            <div className="sm:text-right">
              <p className="m-0 flex items-center gap-1.5 text-sm text-muted-foreground sm:justify-end">
                <Trophy className="h-4 w-4 text-warning" />
                Best score
              </p>
              {!lobby.showResults ? (
                <p className="m-0 mt-1 text-sm text-muted-foreground">
                  Hidden by lecturer
                </p>
              ) : lobby.bestScore !== null ? (
                <p
                  className={cn(
                    'm-0 mt-1 text-4xl font-bold tabular-nums',
                    scoreTone(lobby.bestScore),
                  )}
                >
                  {lobby.bestScore.toFixed(2)}
                  <span className="ml-1 text-base font-medium text-muted-foreground">
                    /10
                  </span>
                </p>
              ) : (
                <p className="m-0 mt-1 text-sm text-muted-foreground">
                  {isFile && lobby.attemptsUsed > 0
                    ? 'Awaiting grade'
                    : 'No score yet'}
                </p>
              )}
            </div>
          </section>

          {/* Attempts history */}
          {lobby.attempts.length > 0 && (
            <section className="overflow-hidden rounded-lg border bg-card">
              <h2 className="m-0 border-b px-5 py-3 text-sm font-semibold">
                Attempts
                <span className="ml-2 font-normal text-muted-foreground">
                  {lobby.attemptsUsed}
                  {lobby.maxAttempts === null ? '' : ` / ${lobby.maxAttempts}`}{' '}
                  used
                  {attemptsLeft !== null && attemptsLeft > 0
                    ? ` · ${attemptsLeft} left`
                    : ''}
                </span>
              </h2>
              <ul className="m-0 list-none divide-y p-0">
                {lobby.attempts.map((item, index) => {
                  const done =
                    item.status === 'COMPLETED' || Boolean(item.submittedAt);
                  const took = tookLabel(item.startedAt, item.endedAt);
                  return (
                    <li
                      key={item.id}
                      className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="m-0 flex items-center gap-2 text-sm font-semibold">
                          Attempt #{item.attemptNumber}
                          {index === bestIndex && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning">
                              <Trophy className="h-3 w-3" />
                              Best
                            </span>
                          )}
                          {item.status === 'IN_PROGRESS' && (
                            <StatusBadge status={item.status} />
                          )}
                        </p>
                        <p className="m-0 mt-0.5 text-xs text-muted-foreground">
                          {formatDateTime(item.startedAt)}
                          {took ? ` · ${took}` : ''}
                        </p>
                      </div>

                      {done && (
                        <span
                          className={cn(
                            'text-base font-bold tabular-nums',
                            lobby.showResults && item.score !== null
                              ? scoreTone(item.score)
                              : 'text-sm font-normal text-muted-foreground',
                          )}
                        >
                          {!lobby.showResults
                            ? 'Hidden'
                            : item.score !== null
                              ? item.score.toFixed(2)
                              : 'Awaiting grade'}
                          {lobby.showResults && item.score !== null && (
                            <span className="ml-0.5 text-xs font-medium text-muted-foreground">
                              /10
                            </span>
                          )}
                        </span>
                      )}

                      {done && lobby.showResults && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onReviewAttempt(item.id)}
                        >
                          <Eye className="mr-1.5 h-3.5 w-3.5" />
                          {isFile ? 'View submission' : 'Review answers'}
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>

        {/* Static facts live in a quiet sidebar instead of three big cards */}
        <aside className="h-fit rounded-lg border bg-card px-5 py-3 lg:sticky lg:top-4">
          <h2 className="m-0 py-1 text-sm font-semibold">Exam details</h2>
          <dl className="m-0 divide-y">
            <InfoRow
              label="Format"
              value={isFile ? 'File submission' : 'Multiple choice'}
            />
            {!isFile && (
              <InfoRow label="Questions" value={String(lobby.questionCount)} />
            )}
            <InfoRow
              label="Time per attempt"
              value={formatMinutes(lobby.durationMinutes)}
            />
            <InfoRow
              label="Attempts allowed"
              value={
                lobby.maxAttempts === null
                  ? 'Unlimited'
                  : String(lobby.maxAttempts)
              }
            />
            <InfoRow label="Opens" value={formatDateTime(lobby.startTime)} />
            <InfoRow label="Closes" value={formatDateTime(lobby.endTime)} />
            <InfoRow
              label="Results"
              value={lobby.showResults ? 'Shown after submit' : 'Hidden'}
            />
            {!isFile && (lobby.shuffleQuestions || lobby.shuffleOptions) && (
              <InfoRow
                label="Shuffled"
                value={[
                  lobby.shuffleQuestions && 'Questions',
                  lobby.shuffleOptions && 'Answers',
                ]
                  .filter(Boolean)
                  .join(' & ')}
              />
            )}
          </dl>
        </aside>
      </div>
    </div>
  );
};

const ActiveAttemptRoom = ({
  attempt,
  onSubmitted,
  onExitToLobby,
}: {
  attempt: ExamAttempt;
  onSubmitted: (sessionId: string, canReview: boolean) => void;
  onExitToLobby: () => void;
}) => {
  const { session, exam, questions } = attempt;
  const flagsKey = `exam-draft-${session.id}-flags`;

  const {
    answers,
    savedQuestionIds,
    dirtyQuestionIds,
    isSaving,
    isOfflineError,
    deadlineMs,
    selectOption,
    flushDirty,
    clearLocalDraft,
  } = useExamAutosave({
    sessionId: session.id,
    initialSavedAnswers: attempt.savedAnswers,
    initialDeadlineIso: attempt.deadline,
    initialServerNowIso: attempt.serverNow,
  });

  const [flags, setFlags] = useState<Record<string, boolean>>(() =>
    readStoredJson(flagsKey, {}),
  );
  const [page, setPage] = useState(0);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const pendingScrollQuestionIdRef = useRef<string | null>(null);

  const { mutate: submitSession, isPending: submitting } =
    useSubmitExamSession();
  const cd = useCountdown(deadlineMs);
  const submitted = useRef(false);

  const totalPages = Math.max(
    1,
    Math.ceil(questions.length / QUESTIONS_PER_PAGE),
  );
  const safePage = Math.min(page, totalPages - 1);
  const pageStart = safePage * QUESTIONS_PER_PAGE;
  const pageEnd = Math.min(pageStart + QUESTIONS_PER_PAGE, questions.length);
  const pageQuestions = questions.slice(pageStart, pageEnd);

  useEffect(() => {
    localStorage.setItem(flagsKey, JSON.stringify(flags));
  }, [flags, flagsKey]);

  // Inform the student upon entering the exam room that their work is automatically saved.
  useEffect(() => {
    toast.info('Your answers are automatically saved as you make progress.', {
      id: `autosave-info-${session.id}`,
      description:
        'Your responses are backed up locally and synced to the server automatically.',
      duration: 5000,
    });
  }, [session.id]);

  // Smoothly scroll to a specific question after switching to its 10-question page.
  useEffect(() => {
    const questionId = pendingScrollQuestionIdRef.current;
    if (!questionId) return;
    pendingScrollQuestionIdRef.current = null;
    const el = document.getElementById(`exam-question-${questionId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [safePage]);

  const toggleFlag = useCallback(
    (questionId: string) =>
      setFlags((f) => ({ ...f, [questionId]: !f[questionId] })),
    [],
  );

  const submit = useCallback(() => {
    if (submitted.current) return;
    submitted.current = true;
    const payload = questions.map((q) => ({
      questionId: q.id,
      optionId: answers[q.id] ?? null,
    }));
    submitSession(
      {
        sessionId: session.id,
        answers: payload,
      },
      {
        onSuccess: (res) => {
          clearLocalDraft();
          setIsReviewOpen(false);
          toast.success(
            res.showResults && res.score !== null
              ? `Exam submitted — Score: ${res.score.toFixed(2)} / 10`
              : 'Exam submitted',
          );
          onSubmitted(session.id, res.showResults);
        },
        onError: () => {
          submitted.current = false;
          toast.error('Could not submit the exam. Please try again.');
        },
      },
    );
  }, [
    answers,
    clearLocalDraft,
    onSubmitted,
    questions,
    session.id,
    submitSession,
  ]);

  useEffect(() => {
    if (cd.expired) submit();
  }, [cd.expired, submit]);

  const handleChangePage = (nextPage: number) => {
    const clamped = Math.min(Math.max(nextPage, 0), totalPages - 1);
    if (clamped === safePage) return;
    void flushDirty();
    setPage(clamped);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleJumpToQuestion = (questionIndex: number) => {
    const targetPage = Math.floor(questionIndex / QUESTIONS_PER_PAGE);
    const targetQuestion = questions[questionIndex];
    setIsReviewOpen(false);
    if (!targetQuestion) return;
    if (targetPage !== safePage) {
      pendingScrollQuestionIdRef.current = targetQuestion.id;
      void flushDirty();
      setPage(targetPage);
    } else {
      requestAnimationFrame(() => {
        const el = document.getElementById(`exam-question-${targetQuestion.id}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    }
  };

  const handleOpenSubmitReview = () => {
    void flushDirty();
    setIsReviewOpen(true);
  };

  if (questions.length === 0) {
    return <EmptyState title="This exam has no questions" />;
  }

  const answeredCount = questions.filter(
    (q) => answers[q.id] !== undefined,
  ).length;
  const flaggedCount = questions.filter((q) => flags[q.id]).length;
  const low = cd.ms < 5 * 60 * 1000;
  const saveStatusText = isOfflineError
    ? 'Auto-save paused (offline)'
    : isSaving
      ? 'Saving answers…'
      : dirtyQuestionIds.size > 0
        ? `${dirtyQuestionIds.size} pending auto-save`
        : 'All answers saved';

  return (
    <div className="space-y-4">
      {isOfflineError && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          <span className="flex items-center gap-2 font-medium">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Connection lost — automatic saving is paused. Your answers are kept
            on this device and will sync when reconnected.
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={isSaving}
            onClick={() => void flushDirty()}
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Retry now
          </Button>
        </div>
      )}

      <PageHeader
        title={`${exam.examName} (Attempt #${session.attemptNumber})`}
        subtitle={`${answeredCount}/${questions.length} answered · ${flaggedCount} flagged · ${saveStatusText}`}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void flushDirty();
                onExitToLobby();
              }}
            >
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Overview
            </Button>
            <div
              role="timer"
              aria-label="Time remaining"
              className={cn(
                'flex items-center gap-1.5 rounded-md border px-4 py-2 font-mono text-xl font-bold',
                low ? 'border-destructive text-destructive' : 'text-brand',
              )}
            >
              <Clock className="h-4 w-4" />
              {pad(cd.hours + cd.days * 24)}:{pad(cd.minutes)}:{pad(cd.seconds)}
            </div>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_290px]">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card px-4 py-3 text-sm">
            <span className="font-semibold">
              Page {safePage + 1} of {totalPages}{' '}
              <span className="font-normal text-muted-foreground">
                (Questions {pageStart + 1}–{pageEnd} of {questions.length})
              </span>
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={safePage === 0}
                onClick={() => handleChangePage(safePage - 1)}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Previous 10
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={safePage >= totalPages - 1}
                onClick={() => handleChangePage(safePage + 1)}
              >
                Next 10
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>

          <ol className="m-0 list-none space-y-4 p-0">
            {pageQuestions.map((q, offset) => {
              const globalIndex = pageStart + offset;
              const selectedOptionId = answers[q.id];
              const isSaved =
                selectedOptionId !== undefined && savedQuestionIds.has(q.id);
              const isDirty =
                selectedOptionId !== undefined && dirtyQuestionIds.has(q.id);
              return (
                <li
                  key={q.id}
                  id={`exam-question-${q.id}`}
                  className="rounded-lg border bg-card p-5"
                >
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">
                        Question {globalIndex + 1} of {questions.length}
                      </span>
                      {isSaved && (
                        <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success">
                          Answer saved
                        </span>
                      )}
                      {isDirty && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          Pending save
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedOptionId !== undefined && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => selectOption(q.id, null)}
                          className="text-xs text-muted-foreground"
                        >
                          Clear choice
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        aria-pressed={Boolean(flags[q.id])}
                        onClick={() => toggleFlag(q.id)}
                      >
                        <Flag
                          className={cn(
                            'mr-1 h-4 w-4',
                            flags[q.id] && 'fill-warning text-warning',
                          )}
                        />
                        {flags[q.id] ? 'Flagged' : 'Flag'}
                      </Button>
                    </div>
                  </div>
                  <p className="mt-0 whitespace-pre-line font-medium">
                    {q.content}
                  </p>
                  <div className="space-y-2">
                    {q.options.map((opt, oi) => {
                      const isSelected = selectedOptionId === opt.id;
                      return (
                        <label
                          key={opt.id}
                          className={cn(
                            'flex cursor-pointer items-center gap-3 rounded-md border p-3 text-sm transition-colors',
                            isSelected
                              ? 'border-primary bg-primary/15 font-medium'
                              : 'hover:bg-accent/50',
                          )}
                        >
                          <input
                            type="radio"
                            name={`q-${q.id}`}
                            checked={isSelected}
                            onChange={() => selectOption(q.id, opt.id)}
                          />
                          <span className="font-semibold text-muted-foreground">
                            {OPTION_LETTERS[oi]}.
                          </span>
                          <span className="flex-1">{opt.content}</span>
                        </label>
                      );
                    })}
                  </div>
                </li>
              );
            })}
          </ol>

          <div className="flex items-center justify-between rounded-lg border bg-card px-4 py-3">
            <Button
              variant="outline"
              disabled={safePage === 0}
              onClick={() => handleChangePage(safePage - 1)}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Previous page
            </Button>
            <span className="text-xs text-muted-foreground">
              Page {safePage + 1} of {totalPages}
            </span>
            {safePage < totalPages - 1 ? (
              <Button
                variant="outline"
                onClick={() => handleChangePage(safePage + 1)}
              >
                Next page
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button disabled={submitting} onClick={handleOpenSubmitReview}>
                Review &amp; submit
              </Button>
            )}
          </div>
        </div>

        <aside className="h-fit rounded-lg border bg-card p-4 lg:sticky lg:top-4">
          <QuestionPalette
            questions={questions}
            answers={answers}
            savedQuestionIds={savedQuestionIds}
            dirtyQuestionIds={dirtyQuestionIds}
            flags={flags}
            pageStart={pageStart}
            pageEnd={pageEnd}
            onSelect={handleJumpToQuestion}
          />
          <Button
            className="mt-4 w-full"
            disabled={submitting}
            onClick={handleOpenSubmitReview}
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
        onJump={handleJumpToQuestion}
        onConfirm={submit}
      />
    </div>
  );
};

const AttemptReviewPanel = ({
  sessionId,
  onBack,
}: {
  sessionId: string;
  onBack: () => void;
}) => {
  const reviewState = toAsyncState(useAttemptReview(sessionId));
  return (
    <AsyncView
      state={reviewState}
      empty={
        <EmptyState
          title="Review not available"
          action={<Button onClick={onBack}>Back to exam</Button>}
        />
      }
    >
      {(review) => <AttemptReviewViewer review={review} onBack={onBack} />}
    </AsyncView>
  );
};

export default ExamRoomPage;
