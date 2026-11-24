import { Modal } from '@shared/components/Modal';
import { Button } from '@shared/components/ui/button';
import {
  getQuestionAnswerState,
  type StudentQuestionDraftAnswer,
} from '../hooks/useExamAutosave';
import type { StudentExamQuestion } from '../types/exams.types';

interface SubmitReviewDialogProps {
  open: boolean;
  questions: StudentExamQuestion[];
  draftAnswers: Record<string, StudentQuestionDraftAnswer>;
  flags: Record<string, boolean>;
  isSubmitting: boolean;
  onClose: () => void;
  onJump: (index: number) => void;
  onConfirm: () => void;
}

const JumpList = ({
  label,
  indexes,
  onJump,
}: {
  label: string;
  indexes: number[];
  onJump: (index: number) => void;
}) => (
  <div className="mb-3">
    <p className="m-0 mb-1.5 text-sm font-medium">
      {label} ({indexes.length})
    </p>
    {indexes.length === 0 ? (
      <p className="m-0 text-sm text-muted-foreground">None</p>
    ) : (
      <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
        {indexes.map((i) => (
          <li key={i}>
            <button
              type="button"
              onClick={() => onJump(i)}
              aria-label={`Go to question ${i + 1}`}
              className="h-8 w-8 rounded-md border bg-card text-sm text-foreground hover:border-primary"
            >
              {i + 1}
            </button>
          </li>
        ))}
      </ul>
    )}
  </div>
);

/** Final review before submitting: lists unanswered, partially answered, and flagged questions so they can be revisited. */
const SubmitReviewDialog = ({
  open,
  questions,
  draftAnswers,
  flags,
  isSubmitting,
  onClose,
  onJump,
  onConfirm,
}: SubmitReviewDialogProps) => {
  const states = questions.map((q) =>
    getQuestionAnswerState(q, draftAnswers[q.id]),
  );
  const unanswered = questions.flatMap((_, i) =>
    states[i] === 'UNANSWERED' ? [i] : [],
  );
  const partiallyAnswered = questions.flatMap((_, i) =>
    states[i] === 'PARTIAL' ? [i] : [],
  );
  const flagged = questions.flatMap((q, i) => (flags[q.id] ? [i] : []));
  const completeCount =
    questions.length - unanswered.length - partiallyAnswered.length;

  return (
    <Modal open={open} title="Submit exam?" onClose={onClose}>
      <p className="mt-0 text-sm text-muted-foreground">
        {completeCount} of {questions.length} questions completely answered. You
        cannot change your answers for this attempt after submitting.
      </p>
      <JumpList label="Unanswered" indexes={unanswered} onJump={onJump} />
      {partiallyAnswered.length > 0 && (
        <div className="mb-3 rounded-md border border-warning/40 bg-warning/10 p-3">
          <JumpList
            label="Partially answered (missing blanks or required selections)"
            indexes={partiallyAnswered}
            onJump={onJump}
          />
          <p className="m-0 text-xs text-muted-foreground">
            All blanks in a fill-in-the-blank question and all required options
            in a multi-answer question must be completed to earn points.
          </p>
        </div>
      )}
      <JumpList label="Flagged for review" indexes={flagged} onJump={onJump} />
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Keep reviewing
        </Button>
        <Button disabled={isSubmitting} onClick={onConfirm}>
          {isSubmitting ? 'Submitting…' : 'Submit now'}
        </Button>
      </div>
    </Modal>
  );
};

export default SubmitReviewDialog;
