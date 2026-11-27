import { cn } from '@shared/utils/cn';
import type { QuestionFit } from '../types/quizzes.types';
import { FIT_HINT, FIT_LABEL, FIT_TONE } from './mastery-display';

/** How hard this question is for this student, as predicted by the model. Renders nothing without a prediction. */
export const QuestionFitBadge = ({ fit }: { fit: QuestionFit | null }) =>
  fit ? (
    <span
      title={FIT_HINT[fit]}
      className={cn('rounded-full px-3 py-1 text-xs font-semibold', FIT_TONE[fit])}
    >
      {FIT_LABEL[fit]}
    </span>
  ) : null;
