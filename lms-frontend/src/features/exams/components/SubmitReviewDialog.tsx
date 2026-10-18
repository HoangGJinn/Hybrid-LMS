import { Modal } from '@shared/components/Modal';
import { Button } from '@shared/components/ui/button';
import type { QuizQuestion } from '@features/quizzes';

interface SubmitReviewDialogProps {
  open: boolean;
  questions: QuizQuestion[];
  answers: Record<string, number>;
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

/** Final review before submitting: lists unanswered and flagged questions so they can be revisited. */
const SubmitReviewDialog = ({
  open,
  questions,
  answers,
  flags,
  isSubmitting,
  onClose,
  onJump,
  onConfirm,
}: SubmitReviewDialogProps) => {
  const unanswered = questions.flatMap((q, i) =>
    answers[q.id] === undefined ? [i] : [],
  );
  const flagged = questions.flatMap((q, i) => (flags[q.id] ? [i] : []));

  return (
    <Modal open={open} title="Submit exam?" onClose={onClose}>
      <p className="mt-0 text-sm text-muted-foreground">
        {questions.length - unanswered.length} of {questions.length} questions
        answered. You cannot change your answers after submitting.
      </p>
      <JumpList label="Unanswered" indexes={unanswered} onJump={onJump} />
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
