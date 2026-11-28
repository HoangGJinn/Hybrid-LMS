export type QuizFocus = 'WEAK' | 'EVEN';

export interface SelectQuestionsInput {
  studentId: string;
  subjectId: string;
  kcIds: string[];
  count: number;
  focus: QuizFocus;
}

/** A chosen question and the knowledge component it was chosen for. */
export interface SelectedQuestion {
  questionId: string;
  kcId: string;
  /** P(correct) the ENAS-KT model predicted for this student when choosing; absent for rule-based picks. */
  pCorrect?: number;
}

/**
 * Decides which questions a quiz contains. The rule-based implementation can later be replaced by one
 * that asks the ENAS-KT model, without touching quiz creation, answering or grading.
 */
export interface QuestionSelector {
  select(input: SelectQuestionsInput): Promise<SelectedQuestion[]>;
}

export const QUESTION_SELECTOR = Symbol('QUESTION_SELECTOR');