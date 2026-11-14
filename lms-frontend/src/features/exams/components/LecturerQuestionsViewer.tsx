import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  FileQuestion,
  Search,
  X,
} from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import { cn } from '@shared/utils/cn';
import type { LecturerExam } from '../types/exams.types';

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'] as const;
const QUESTIONS_PER_PAGE = 10;

interface LecturerQuestionsViewerProps {
  exam: LecturerExam;
}

export const LecturerQuestionsViewer = ({
  exam,
}: LecturerQuestionsViewerProps) => {
  const { questions } = exam;
  const [page, setPage] = useState(0);
  const [viewAll, setViewAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const pendingScrollIdRef = useRef<string | null>(null);

  // Map each question to its 0-based original index and correct option letter.
  const questionMeta = useMemo(
    () =>
      questions.map((q, index) => {
        const correctOptIndex = q.options.findIndex((o) => o.isCorrect);
        const correctLetter =
          correctOptIndex >= 0 ? OPTION_LETTERS[correctOptIndex] : null;
        return {
          question: q,
          originalIndex: index,
          correctLetter,
        };
      }),
    [questions],
  );

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return questionMeta;
    return questionMeta.filter(
      (item) =>
        item.question.content.toLowerCase().includes(q) ||
        item.question.options.some((opt) =>
          opt.content.toLowerCase().includes(q),
        ),
    );
  }, [questionMeta, searchQuery]);

  const totalPages = Math.max(
    1,
    Math.ceil(filtered.length / QUESTIONS_PER_PAGE),
  );
  const safePage = Math.min(page, totalPages - 1);
  const pageStart = safePage * QUESTIONS_PER_PAGE;
  const pageEnd = Math.min(pageStart + QUESTIONS_PER_PAGE, filtered.length);

  const displayedQuestions = viewAll
    ? filtered
    : filtered.slice(pageStart, pageEnd);

  // Smooth scroll after page change if jumping from palette.
  useEffect(() => {
    const id = pendingScrollIdRef.current;
    if (!id) return;
    pendingScrollIdRef.current = null;
    requestAnimationFrame(() => {
      const el = document.getElementById(`lecturer-question-${id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  }, [safePage, viewAll]);

  const handleJumpToQuestion = (targetOriginalIndex: number) => {
    const targetItem = questionMeta[targetOriginalIndex];
    if (!targetItem) return;

    // If there is an active search filter that excludes this question, clear it.
    if (searchQuery.trim() !== '') {
      const isVisibleInFiltered = filtered.some(
        (item) => item.originalIndex === targetOriginalIndex,
      );
      if (!isVisibleInFiltered) {
        setSearchQuery('');
      }
    }

    if (viewAll) {
      const el = document.getElementById(
        `lecturer-question-${targetItem.question.id}`,
      );
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      const targetFilteredIndex = filtered.findIndex(
        (item) => item.originalIndex === targetOriginalIndex,
      );
      const targetPage =
        targetFilteredIndex >= 0
          ? Math.floor(targetFilteredIndex / QUESTIONS_PER_PAGE)
          : Math.floor(targetOriginalIndex / QUESTIONS_PER_PAGE);

      pendingScrollIdRef.current = targetItem.question.id;
      if (targetPage !== safePage) {
        setPage(targetPage);
      } else {
        const el = document.getElementById(
          `lecturer-question-${targetItem.question.id}`,
        );
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      {/* Left Column: Questions List with Pagination & Controls */}
      <div className="space-y-4">
        {/* Top Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-3 text-sm">
          <div className="flex items-center gap-2">
            {!viewAll && filtered.length > QUESTIONS_PER_PAGE ? (
              <span className="font-semibold">
                Page {safePage + 1} of {totalPages}{' '}
                <span className="font-normal text-muted-foreground">
                  (Questions {pageStart + 1}–{pageEnd} of {filtered.length})
                </span>
              </span>
            ) : (
              <span className="font-semibold text-muted-foreground">
                Showing {filtered.length}{' '}
                {filtered.length === 1 ? 'question' : 'questions'}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {filtered.length > QUESTIONS_PER_PAGE && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewAll(!viewAll)}
                className="text-xs"
              >
                {viewAll ? 'Show 10 per page' : 'View all questions'}
              </Button>
            )}

            {!viewAll && filtered.length > QUESTIONS_PER_PAGE && (
              <div className="flex items-center gap-1">
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
        </div>

        {/* Search input if question count >= 5 */}
        {questions.length >= 5 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(0);
              }}
              placeholder="Search in questions or answers…"
              className="pl-9 pr-9"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setPage(0);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        {displayedQuestions.length === 0 ? (
          <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
            No questions matched your search query.
          </div>
        ) : (
          <ol className="m-0 list-none space-y-4 p-0">
            {displayedQuestions.map((item) => {
              const { question, originalIndex, correctLetter } = item;
              return (
                <li
                  key={question.id}
                  id={`lecturer-question-${question.id}`}
                  className="rounded-lg border bg-card p-5 transition-colors"
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <span className="text-sm font-semibold text-brand">
                      Question {originalIndex + 1} of {questions.length}
                    </span>
                    {correctLetter && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-semibold text-success">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Key: {correctLetter}
                      </span>
                    )}
                  </div>

                  <p className="mt-0 whitespace-pre-line font-medium text-foreground">
                    {question.content}
                  </p>

                  <ul className="m-0 list-none space-y-2 p-0">
                    {question.options.map((option, optionIndex) => (
                      <li
                        key={option.id}
                        className={cn(
                          'flex items-center gap-3 rounded-md border p-3 text-sm transition-colors',
                          option.isCorrect
                            ? 'border-success bg-success/10'
                            : 'bg-background text-muted-foreground',
                        )}
                      >
                        {option.isCorrect ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                        ) : (
                          <Circle className="h-4 w-4 shrink-0 text-muted-foreground/60" />
                        )}
                        <span
                          className={cn(
                            'font-semibold',
                            option.isCorrect
                              ? 'text-success'
                              : 'text-foreground',
                          )}
                        >
                          {OPTION_LETTERS[optionIndex]}.
                        </span>
                        <span
                          className={cn(
                            'flex-1',
                            option.isCorrect && 'font-medium text-foreground',
                          )}
                        >
                          {option.content}
                        </span>
                        {option.isCorrect && (
                          <span className="text-xs font-semibold text-success">
                            Correct answer
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ol>
        )}

        {/* Bottom Pagination */}
        {!viewAll && totalPages > 1 && (
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

      {/* Right Column: Sticky Exam Overview & Question Navigator */}
      <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
        {/* Exam Overview Summary */}
        <div className="rounded-lg border bg-card p-4 text-sm shadow-sm">
          <p className="mt-0 flex items-center gap-1.5 font-semibold text-foreground">
            <FileQuestion className="h-4 w-4 text-brand" />
            Exam details
          </p>
          <dl className="mt-2 space-y-1.5 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <dt>Total questions:</dt>
              <dd className="font-semibold text-foreground">
                {questions.length}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt>Duration:</dt>
              <dd className="font-semibold text-foreground">
                {exam.durationMinutes} mins
              </dd>
            </div>
            <div className="flex justify-between">
              <dt>Max attempts:</dt>
              <dd className="font-semibold text-foreground">
                {exam.maxAttempts === null
                  ? 'Unlimited'
                  : `${exam.maxAttempts} times`}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt>Student review:</dt>
              <dd className="font-semibold text-foreground">
                {exam.showResults ? 'Visible' : 'Hidden'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt>Shuffling:</dt>
              <dd className="font-semibold text-foreground">
                {[
                  exam.shuffleQuestions && 'Questions',
                  exam.shuffleOptions && 'Answers',
                ]
                  .filter(Boolean)
                  .join(' & ') || 'Disabled'}
              </dd>
            </div>
          </dl>
        </div>

        {/* Question Palette / Answer Key Grid */}
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <p className="m-0 text-sm font-semibold text-foreground">
              Question Navigator
            </p>
            <span className="text-xs text-muted-foreground">
              Click to jump
            </span>
          </div>

          <p className="mb-3 mt-0 text-xs text-muted-foreground">
            Shows question number with its correct answer key letter:
          </p>

          <div className="grid grid-cols-5 gap-1.5">
            {questionMeta.map((item) => {
              const { originalIndex, correctLetter } = item;
              const isCurrentPage =
                !viewAll &&
                Math.floor(originalIndex / QUESTIONS_PER_PAGE) === safePage;

              return (
                <button
                  key={originalIndex}
                  type="button"
                  onClick={() => handleJumpToQuestion(originalIndex)}
                  title={`Question ${originalIndex + 1} · Key: ${correctLetter ?? 'None'}`}
                  className={cn(
                    'flex flex-col items-center justify-center rounded-md border p-1.5 text-xs transition-colors',
                    isCurrentPage
                      ? 'border-brand bg-brand/10 font-bold text-brand shadow-sm'
                      : 'border-border bg-background text-foreground hover:border-primary/50 hover:bg-accent',
                  )}
                >
                  <span className="text-[11px] leading-tight font-medium">
                    {originalIndex + 1}
                  </span>
                  {correctLetter && (
                    <span className="text-[10px] font-bold text-success leading-tight">
                      {correctLetter}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </aside>
    </div>
  );
};
