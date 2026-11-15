import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Download,
  FileText,
  MessageSquare,
  Trophy,
  XCircle,
} from 'lucide-react';
import { PageHeader } from '@shared/components/PageHeader';
import { Button } from '@shared/components/ui/button';
import { cn } from '@shared/utils/cn';
import { formatDateTime } from '@shared/utils/format';
import type {
  ExamAttemptReview,
  ExamOption,
  ExamReviewQuestion,
} from '../types/exams.types';

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'] as const;
const QUESTIONS_PER_PAGE = 10;

type ReviewFilter = 'ALL' | 'CORRECT' | 'INCORRECT' | 'UNANSWERED';

interface QuestionMeta {
  question: ExamReviewQuestion;
  originalIndex: number;
  selectedOption: ExamOption | undefined;
  isAnswered: boolean;
  isCorrect: boolean;
  status: 'CORRECT' | 'INCORRECT' | 'UNANSWERED';
}

interface AttemptReviewViewerProps {
  review: ExamAttemptReview;
  onBack: () => void;
}

export const AttemptReviewViewer = ({
  review,
  onBack,
}: AttemptReviewViewerProps) => {
  const [filter, setFilter] = useState<ReviewFilter>('ALL');
  const [page, setPage] = useState(0);
  const pendingScrollIdRef = useRef<string | null>(null);

  // Pre-calculate status and metadata for all questions.
  const questionMetas: QuestionMeta[] = useMemo(
    () =>
      review.questions.map((question: ExamReviewQuestion, index: number) => {
        const selectedOption = question.options.find(
          (o: ExamOption) => o.id === question.selectedOptionId,
        );
        const isAnswered = question.selectedOptionId !== null;
        const isCorrect = Boolean(selectedOption?.isCorrect);
        const status: 'CORRECT' | 'INCORRECT' | 'UNANSWERED' = !isAnswered
          ? 'UNANSWERED'
          : isCorrect
            ? 'CORRECT'
            : 'INCORRECT';

        return {
          question,
          originalIndex: index,
          selectedOption,
          isAnswered,
          isCorrect,
          status,
        };
      }),
    [review.questions],
  );

  const counts = useMemo(
    () => ({
      ALL: questionMetas.length,
      CORRECT: questionMetas.filter((q: QuestionMeta) => q.status === 'CORRECT')
        .length,
      INCORRECT: questionMetas.filter(
        (q: QuestionMeta) => q.status === 'INCORRECT',
      ).length,
      UNANSWERED: questionMetas.filter(
        (q: QuestionMeta) => q.status === 'UNANSWERED',
      ).length,
    }),
    [questionMetas],
  );

  const filteredQuestions: QuestionMeta[] = useMemo(() => {
    if (filter === 'ALL') return questionMetas;
    return questionMetas.filter((q: QuestionMeta) => q.status === filter);
  }, [filter, questionMetas]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredQuestions.length / QUESTIONS_PER_PAGE),
  );
  const safePage = Math.min(page, totalPages - 1);
  const pageStart = safePage * QUESTIONS_PER_PAGE;
  const pageEnd = Math.min(
    pageStart + QUESTIONS_PER_PAGE,
    filteredQuestions.length,
  );
  const displayedQuestions = filteredQuestions.slice(pageStart, pageEnd);

  // Smooth scroll after page or filter change when jumping from palette.
  useEffect(() => {
    const id = pendingScrollIdRef.current;
    if (!id) return;
    pendingScrollIdRef.current = null;
    requestAnimationFrame(() => {
      const el = document.getElementById(`review-question-${id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  }, [filter, safePage]);

  const handleJumpToQuestion = (targetOriginalIndex: number) => {
    const targetMeta = questionMetas[targetOriginalIndex];
    if (!targetMeta) return;

    // If current filter hides this question, reset to ALL.
    if (filter !== 'ALL' && targetMeta.status !== filter) {
      setFilter('ALL');
    }

    // Determine target page in the filtered list (or ALL list).
    const listToSearch =
      filter !== 'ALL' && targetMeta.status !== filter
        ? questionMetas
        : filteredQuestions;

    const filteredIndex = listToSearch.findIndex(
      (item: QuestionMeta) => item.originalIndex === targetOriginalIndex,
    );
    const targetPage =
      filteredIndex >= 0
        ? Math.floor(filteredIndex / QUESTIONS_PER_PAGE)
        : Math.floor(targetOriginalIndex / QUESTIONS_PER_PAGE);

    pendingScrollIdRef.current = targetMeta.question.id;
    if (targetPage !== safePage) {
      setPage(targetPage);
    } else {
      const el = document.getElementById(
        `review-question-${targetMeta.question.id}`,
      );
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const percentage = Math.round(
    (counts.CORRECT / Math.max(1, questionMetas.length)) * 100,
  );
  const displayScore = review.score ?? 0;

  if (review.format === 'FILE') {
    const submittedFiles = review.submittedFiles ?? [];
    return (
      <div className="mx-auto max-w-4xl space-y-5">
        <PageHeader
          title={`${review.examName} — Submission & Grade Review`}
          subtitle={
            review.score !== null
              ? `Final Score: ${review.score.toFixed(2)} / 10${review.gradedAt ? ` · Graded ${formatDateTime(review.gradedAt)}` : ''}`
              : 'Submitted · Awaiting lecturer grading'
          }
          actions={
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Back to exam overview
            </Button>
          }
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border bg-card p-5">
            <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <Trophy className="h-4 w-4 text-warning" />
              Grade
            </span>
            <p className="m-0 mt-2 text-2xl font-bold text-brand">
              {review.score !== null
                ? `${review.score.toFixed(2)} / 10`
                : 'Pending lecturer grade'}
            </p>
            {review.submittedAt && (
              <p className="m-0 mt-1 text-xs text-muted-foreground">
                Submitted {formatDateTime(review.submittedAt)}
              </p>
            )}
          </div>

          <div className="rounded-lg border bg-card p-5">
            <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <MessageSquare className="h-4 w-4 text-brand" />
              Lecturer feedback
            </span>
            <p className="m-0 mt-2 whitespace-pre-line text-sm">
              {review.comment
                ? review.comment
                : 'No feedback comment provided yet.'}
            </p>
          </div>
        </div>

        {review.questionFile && (
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border bg-card p-5">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-primary" />
              <div>
                <p className="m-0 text-sm font-semibold">Question Paper</p>
                <p className="m-0 text-xs text-muted-foreground">
                  {review.questionFile.fileName}
                </p>
              </div>
            </div>
            <Button asChild variant="outline" size="sm">
              <a
                href={review.questionFile.downloadUrl}
                target="_blank"
                rel="noreferrer"
              >
                <Download className="mr-1.5 h-4 w-4" />
                Download question paper
              </a>
            </Button>
          </div>
        )}

        <div className="rounded-lg border bg-card p-5">
          <h2 className="m-0 mb-3 text-base font-semibold">
            Submitted Files ({submittedFiles.length})
          </h2>
          {submittedFiles.length === 0 ? (
            <p className="m-0 text-sm text-muted-foreground">
              No files were submitted for this attempt.
            </p>
          ) : (
            <ul className="m-0 divide-y rounded-md border p-0 list-none">
              {submittedFiles.map((file) => (
                <li
                  key={file.fileId}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"
                >
                  <div className="flex items-center gap-2.5">
                    <FileText className="h-4 w-4 text-brand" />
                    <span className="font-medium">{file.fileName}</span>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <a
                      href={file.downloadUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Download className="mr-1.5 h-3.5 w-3.5" />
                      Download
                    </a>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={`${review.examName} — Attempt #${review.attemptNumber} Review`}
        subtitle={`Score: ${displayScore.toFixed(2)} / 10 · ${review.correctCount} / ${review.totalQuestions} correct (${percentage}%)`}
        actions={
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back to exam overview
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* Left Column: Filter Chips, Questions, and Pagination */}
        <div className="space-y-4">
          {/* Smart Filter Chips Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-3 text-sm">
            <div
              role="group"
              aria-label="Filter questions by result"
              className="flex flex-wrap gap-1.5"
            >
              <button
                type="button"
                aria-pressed={filter === 'ALL'}
                onClick={() => {
                  setFilter('ALL');
                  setPage(0);
                }}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
                  filter === 'ALL'
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'bg-card text-foreground hover:bg-accent',
                )}
              >
                All ({counts.ALL})
              </button>

              <button
                type="button"
                aria-pressed={filter === 'CORRECT'}
                onClick={() => {
                  setFilter('CORRECT');
                  setPage(0);
                }}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
                  filter === 'CORRECT'
                    ? 'border-success bg-success text-success-foreground'
                    : 'border-success/30 bg-success/10 text-success hover:bg-success/20',
                )}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Correct ({counts.CORRECT})
              </button>

              <button
                type="button"
                aria-pressed={filter === 'INCORRECT'}
                onClick={() => {
                  setFilter('INCORRECT');
                  setPage(0);
                }}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
                  filter === 'INCORRECT'
                    ? 'border-destructive bg-destructive text-destructive-foreground'
                    : 'border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20',
                )}
              >
                <XCircle className="h-3.5 w-3.5" />
                Incorrect ({counts.INCORRECT})
              </button>

              <button
                type="button"
                aria-pressed={filter === 'UNANSWERED'}
                onClick={() => {
                  setFilter('UNANSWERED');
                  setPage(0);
                }}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
                  filter === 'UNANSWERED'
                    ? 'border-muted-foreground bg-muted-foreground text-background'
                    : 'border-muted bg-muted text-muted-foreground hover:bg-muted/80',
                )}
              >
                <Circle className="h-3.5 w-3.5" />
                Unanswered ({counts.UNANSWERED})
              </button>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center gap-1 text-xs">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safePage === 0}
                  onClick={() => {
                    setPage((p) => Math.max(0, p - 1));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  <ChevronLeft className="mr-1 h-3.5 w-3.5" />
                  Prev
                </Button>
                <span className="px-2 font-medium text-muted-foreground">
                  {safePage + 1} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safePage >= totalPages - 1}
                  onClick={() => {
                    setPage((p) => Math.min(totalPages - 1, p + 1));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  Next
                  <ChevronRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>

          {/* Question Cards List */}
          {displayedQuestions.length === 0 ? (
            <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
              No questions found for this filter.
            </div>
          ) : (
            <ol className="m-0 list-none space-y-4 p-0">
              {displayedQuestions.map((meta: QuestionMeta) => {
                const { question, originalIndex, status } = meta;
                return (
                  <li
                    key={question.id}
                    id={`review-question-${question.id}`}
                    className="rounded-lg border bg-card p-5 transition-colors"
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-brand">
                        Question {originalIndex + 1} of {review.totalQuestions}
                      </span>
                      {status === 'UNANSWERED' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                          Not answered
                        </span>
                      ) : status === 'CORRECT' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-medium text-success">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Correct
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2.5 py-0.5 text-xs font-medium text-destructive">
                          <XCircle className="h-3.5 w-3.5" />
                          Incorrect
                        </span>
                      )}
                    </div>

                    <p className="mt-0 whitespace-pre-line font-medium text-foreground">
                      {question.content}
                    </p>

                    <ul className="m-0 list-none space-y-2 p-0">
                      {question.options.map(
                        (option: ExamOption, optionIndex: number) => {
                          const isSelected =
                            question.selectedOptionId === option.id;
                          return (
                            <li
                              key={option.id}
                              className={cn(
                                'flex items-center gap-3 rounded-md border p-3 text-sm transition-colors',
                                option.isCorrect
                                  ? 'border-success bg-success/10 font-medium'
                                  : isSelected
                                    ? 'border-destructive bg-destructive/10'
                                    : 'bg-background text-muted-foreground',
                              )}
                            >
                              {option.isCorrect ? (
                                <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                              ) : isSelected ? (
                                <XCircle className="h-4 w-4 shrink-0 text-destructive" />
                              ) : (
                                <span className="h-4 w-4 shrink-0" />
                              )}
                              <span
                                className={cn(
                                  'font-semibold',
                                  option.isCorrect
                                    ? 'text-success'
                                    : isSelected
                                      ? 'text-destructive'
                                      : 'text-foreground',
                                )}
                              >
                                {OPTION_LETTERS[optionIndex]}.
                              </span>
                              <span className="flex-1 text-foreground">
                                {option.content}
                              </span>
                              {isSelected && (
                                <span
                                  className={cn(
                                    'text-xs font-semibold',
                                    option.isCorrect
                                      ? 'text-success'
                                      : 'text-destructive',
                                  )}
                                >
                                  Your answer
                                </span>
                              )}
                              {option.isCorrect && (
                                <span className="text-xs font-semibold text-success">
                                  Correct answer
                                </span>
                              )}
                            </li>
                          );
                        },
                      )}
                    </ul>
                  </li>
                );
              })}
            </ol>
          )}

          {/* Bottom Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t pt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={safePage === 0}
                onClick={() => {
                  setPage((p) => Math.max(0, p - 1));
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Previous page
              </Button>
              <span className="text-xs text-muted-foreground">
                Page {safePage + 1} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={safePage >= totalPages - 1}
                onClick={() => {
                  setPage((p) => Math.min(totalPages - 1, p + 1));
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                Next page
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Right Column: Result Summary Card & Question Navigator Palette */}
        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          {/* Result Summary Card */}
          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <p className="mt-0 flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <Trophy className="h-4 w-4 text-brand" />
              Attempt result
            </p>

            <div className="my-3 flex items-baseline justify-between rounded-md bg-muted/40 p-3">
              <span className="text-xs text-muted-foreground">Final score:</span>
              <div className="text-2xl font-black text-brand">
                {displayScore.toFixed(2)}{' '}
                <span className="text-xs font-normal text-muted-foreground">
                  / 10
                </span>
              </div>
            </div>

            <dl className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Accuracy:</dt>
                <dd className="font-semibold text-foreground">{percentage}%</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Correct:</dt>
                <dd className="font-semibold text-success">
                  {counts.CORRECT} / {review.totalQuestions}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Incorrect:</dt>
                <dd className="font-semibold text-destructive">
                  {counts.INCORRECT}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Unanswered:</dt>
                <dd className="font-semibold text-muted-foreground">
                  {counts.UNANSWERED}
                </dd>
              </div>
            </dl>
          </div>

          {/* Review Question Palette */}
          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <p className="m-0 text-sm font-semibold text-foreground">
                Review Navigator
              </p>
              <span className="text-xs text-muted-foreground">
                Click to jump
              </span>
            </div>

            <p className="mb-3 mt-0 text-xs text-muted-foreground">
              Color indicates result for each question:
            </p>

            <div className="grid grid-cols-5 gap-1.5">
              {questionMetas.map((meta: QuestionMeta) => {
                const { originalIndex, status } = meta;
                const isCorrect = status === 'CORRECT';
                const isIncorrect = status === 'INCORRECT';

                return (
                  <button
                    key={originalIndex}
                    type="button"
                    onClick={() => handleJumpToQuestion(originalIndex)}
                    title={`Question ${originalIndex + 1}: ${status}`}
                    className={cn(
                      'flex flex-col items-center justify-center rounded-md border p-1.5 text-xs transition-colors',
                      isCorrect
                        ? 'border-success/40 bg-success/15 font-semibold text-success hover:bg-success/25'
                        : isIncorrect
                          ? 'border-destructive/40 bg-destructive/15 font-semibold text-destructive hover:bg-destructive/25'
                          : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted',
                    )}
                  >
                    <span className="text-xs leading-none">
                      {originalIndex + 1}
                    </span>
                    <span className="mt-0.5 text-[9px] leading-none">
                      {isCorrect ? '✓' : isIncorrect ? '✗' : '–'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
