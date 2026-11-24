import { useState } from 'react';
import { Flag } from 'lucide-react';
import { cn } from '@shared/utils/cn';
import {
  getQuestionAnswerState,
  type StudentQuestionDraftAnswer,
} from '../hooks/useExamAutosave';
import type { StudentExamQuestion } from '../types/exams.types';

type PaletteFilter = 'all' | 'unanswered' | 'flagged';

interface QuestionPaletteProps {
  questions: StudentExamQuestion[];
  draftAnswers: Record<string, StudentQuestionDraftAnswer>;
  savedQuestionIds: ReadonlySet<string>;
  dirtyQuestionIds: ReadonlySet<string>;
  flags: Record<string, boolean>;
  pageStart: number;
  pageEnd: number;
  onSelect: (index: number) => void;
}

const FILTER_LABEL: Record<PaletteFilter, string> = {
  all: 'All',
  unanswered: 'Incomplete',
  flagged: 'Flagged',
};

const describeQuestion = (
  index: number,
  isSaved: boolean,
  isPartial: boolean,
  isDirty: boolean,
  isFlagged: boolean,
  isOnCurrentPage: boolean,
): string => {
  const status = isPartial
    ? 'partially answered (incomplete)'
    : isSaved
      ? 'answer saved'
      : isDirty
        ? 'answered (saving...)'
        : 'not answered';
  return [
    `Question ${index + 1}`,
    status,
    isFlagged && 'flagged for review',
    isOnCurrentPage && 'on current page',
  ]
    .filter(Boolean)
    .join(', ');
};

/** Question navigator for the exam room: status per question (saved vs incomplete/pending), legend, and filters. */
const QuestionPalette = ({
  questions,
  draftAnswers,
  savedQuestionIds,
  dirtyQuestionIds,
  flags,
  pageStart,
  pageEnd,
  onSelect,
}: QuestionPaletteProps) => {
  const [filter, setFilter] = useState<PaletteFilter>('all');
  const states = questions.map((q) =>
    getQuestionAnswerState(q, draftAnswers[q.id]),
  );
  const completedCount = states.filter((s) => s === 'ANSWERED').length;
  const flaggedCount = questions.filter((q) => flags[q.id]).length;
  const counts: Record<PaletteFilter, number> = {
    all: questions.length,
    unanswered: questions.length - completedCount,
    flagged: flaggedCount,
  };

  const matchesFilter = (q: StudentExamQuestion, index: number) =>
    filter === 'all' ||
    (filter === 'unanswered' && states[index] !== 'ANSWERED') ||
    (filter === 'flagged' && Boolean(flags[q.id]));

  return (
    <div>
      <p className="mt-0 text-sm font-semibold">Question navigator</p>
      <div
        role="group"
        aria-label="Filter questions"
        className="mb-3 flex flex-wrap gap-1.5"
      >
        {(Object.keys(FILTER_LABEL) as PaletteFilter[]).map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
            className={cn(
              'rounded-full border px-2.5 py-1 text-xs font-medium',
              filter === f
                ? 'border-primary bg-primary text-primary-foreground'
                : 'bg-card text-foreground hover:bg-accent',
            )}
          >
            {FILTER_LABEL[f]} ({counts[f]})
          </button>
        ))}
      </div>
      <div className="grid grid-cols-5 gap-2">
        {questions.map((q, i) => {
          const state = states[i];
          const isPartial = state === 'PARTIAL';
          const isAnswered = state === 'ANSWERED';
          const isSaved =
            isAnswered &&
            savedQuestionIds.has(q.id) &&
            !dirtyQuestionIds.has(q.id);
          const isDirty =
            isPartial || (isAnswered && dirtyQuestionIds.has(q.id));
          const isFlagged = Boolean(flags[q.id]);
          const isOnCurrentPage = i >= pageStart && i < pageEnd;
          const label = describeQuestion(
            i,
            isSaved,
            isPartial,
            isDirty,
            isFlagged,
            isOnCurrentPage,
          );
          return (
            <button
              key={q.id}
              type="button"
              title={label}
              aria-label={label}
              aria-current={isOnCurrentPage ? 'step' : undefined}
              onClick={() => onSelect(i)}
              className={cn(
                'relative h-9 rounded-md border text-sm font-medium transition-opacity',
                isSaved
                  ? 'border-primary bg-primary text-primary-foreground'
                  : isPartial
                    ? 'border-dashed border-warning bg-warning/15 text-foreground'
                    : isDirty
                      ? 'border-dashed border-primary bg-primary/20 text-foreground'
                      : 'bg-card text-foreground hover:bg-accent',
                isFlagged && 'border-warning',
                isOnCurrentPage &&
                  'ring-2 ring-ring ring-offset-1 ring-offset-card',
                !matchesFilter(q, i) && 'opacity-30',
              )}
            >
              {i + 1}
              {isFlagged && (
                <Flag
                  aria-hidden="true"
                  className="absolute -right-1.5 -top-1.5 h-3.5 w-3.5 fill-warning text-warning"
                />
              )}
            </button>
          );
        })}
      </div>
      <ul className="m-0 mt-4 grid list-none gap-1.5 p-0 text-xs text-muted-foreground">
        <li className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm border border-primary bg-primary" />
          Answer saved
        </li>
        <li className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm border border-dashed border-primary bg-primary/20" />
          Answered (pending save)
        </li>
        <li className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm border border-dashed border-warning bg-warning/15" />
          Partially answered (incomplete)
        </li>
        <li className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm border bg-card" />
          Not answered
        </li>
        <li className="flex items-center gap-2">
          <Flag
            aria-hidden="true"
            className="h-3 w-3 fill-warning text-warning"
          />
          Flagged for review
        </li>
        <li className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm ring-2 ring-ring" />
          Current 10-question page
        </li>
      </ul>
    </div>
  );
};

export default QuestionPalette;
