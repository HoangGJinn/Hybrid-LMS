import type { ReactNode } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import { cn } from '@shared/utils/cn';
import type {
  BankQuestion,
  QuestionDifficulty,
  QuestionReviewStatus,
  QuestionSource,
  ReviewDecision,
} from '../types/question-bank.types';

const REVIEW_LABEL: Record<QuestionReviewStatus, string> = {
  PENDING_REVIEW: 'Pending review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};
const REVIEW_STYLE: Record<QuestionReviewStatus, string> = {
  PENDING_REVIEW: 'bg-amber-100 text-amber-900',
  APPROVED: 'bg-success/15 text-success',
  REJECTED: 'bg-destructive/10 text-destructive',
};
const DIFFICULTY_STYLE: Record<QuestionDifficulty, string> = {
  EASY: 'bg-sky-100 text-sky-900',
  MEDIUM: 'bg-violet-100 text-violet-900',
  HARD: 'bg-rose-100 text-rose-900',
};
const SOURCE_LABEL: Record<QuestionSource, string> = {
  LECTURER_UPLOAD: 'Excel upload',
  AI_GENERATED: 'AI generated',
  MANUAL: 'Manual',
};

const capitalize = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

const Pill = ({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) => (
  <span
    className={cn(
      'rounded-full px-2.5 py-0.5 text-xs font-medium',
      className,
    )}
  >
    {children}
  </span>
);

interface QuestionCardProps {
  question: BankQuestion;
  /** Position in the whole list, starting at 1. */
  number: number;
  expanded: boolean;
  /** A request for this question is running. */
  busy: boolean;
  onToggle: () => void;
  onReview: (decision: ReviewDecision) => void;
  onSetActive: (isActive: boolean) => void;
}

export const QuestionCard = ({
  question: q,
  number,
  expanded,
  busy,
  onToggle,
  onReview,
  onSetActive,
}: QuestionCardProps) => (
  <li
    className={cn(
      'overflow-hidden rounded-lg border bg-card',
      !q.isActive && 'opacity-70',
    )}
  >
    <div className="flex items-start gap-3 p-4">
      <button
        type="button"
        aria-expanded={expanded}
        onClick={onToggle}
        className="flex min-w-0 flex-1 flex-col gap-2 border-0 bg-transparent p-0 text-left"
      >
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">#{number}</span>
          <Pill className={REVIEW_STYLE[q.reviewStatus]}>
            {REVIEW_LABEL[q.reviewStatus]}
          </Pill>
          <Pill className={DIFFICULTY_STYLE[q.difficulty]}>
            {capitalize(q.difficulty)}
          </Pill>
          <Pill
            className={
              q.source === 'AI_GENERATED'
                ? 'bg-purple-100 text-purple-900'
                : 'bg-muted text-muted-foreground'
            }
          >
            {SOURCE_LABEL[q.source]}
          </Pill>
          {!q.isActive && (
            <Pill className="border text-muted-foreground">Inactive</Pill>
          )}
        </span>
        <span className="font-medium">{q.questionText}</span>
        <span className="flex flex-wrap gap-1.5">
          {q.knowledgeComponents.map((kc) => (
            <Pill key={kc.kcId} className="bg-primary/15 text-brand">
              {kc.name}
            </Pill>
          ))}
        </span>
      </button>

      <button
        type="button"
        role="switch"
        aria-checked={q.isActive}
        aria-label="Question is active in quizzes"
        disabled={busy}
        onClick={() => onSetActive(!q.isActive)}
        className="flex shrink-0 items-center gap-2 p-2 text-sm disabled:opacity-60"
      >
        <span
          className={cn(
            'relative h-6 w-10 rounded-full transition-colors',
            q.isActive ? 'bg-primary' : 'bg-muted-foreground',
          )}
        >
          <span
            className={cn(
              'absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all',
              q.isActive ? 'left-[18px]' : 'left-0.5',
            )}
          />
        </span>
        Active
      </button>
    </div>

    {expanded && (
      <div className="space-y-4 border-t bg-muted/30 p-4">
        <ul className="m-0 list-none space-y-2 p-0">
          {q.options.map((o) => (
            <li
              key={o.id}
              className={cn(
                'flex items-center gap-3 rounded-md border p-3 text-sm',
                o.isCorrect ? 'border-success bg-success/10' : 'bg-card',
              )}
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border bg-background text-xs font-semibold">
                {o.optionLabel}
              </span>
              <span className="flex-1">{o.optionText}</span>
              {o.isCorrect && (
                <span className="flex items-center gap-1 text-xs font-semibold text-success">
                  <Check className="h-4 w-4" />
                  Correct
                </span>
              )}
            </li>
          ))}
        </ul>

        {q.explanation && (
          <p className="m-0 text-sm text-muted-foreground">
            <strong className="text-foreground">Explanation:</strong>{' '}
            {q.explanation}
          </p>
        )}

        {q.reviewStatus === 'PENDING_REVIEW' ? (
          <div className="flex gap-2">
            <Button
              type="button"
              disabled={busy}
              onClick={() => onReview('APPROVED')}
            >
              Approve
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => onReview('REJECTED')}
            >
              Reject
            </Button>
          </div>
        ) : (
          <p className="m-0 text-xs text-muted-foreground">
            {REVIEW_LABEL[q.reviewStatus]}
          </p>
        )}
      </div>
    )}
  </li>
);