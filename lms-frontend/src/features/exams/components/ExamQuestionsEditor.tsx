import { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Plus,
  Trash2,
} from 'lucide-react';
import { Modal } from '@shared/components/Modal';
import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import { cn } from '@shared/utils/cn';
import {
  addOption,
  createEmptyQuestion,
  EXAM_MAX_QUESTIONS,
  isQuestionComplete,
  MAX_OPTIONS,
  MIN_OPTIONS,
  OPTION_MAX_LENGTH,
  QUESTION_MAX_LENGTH,
  removeOption,
  validateQuestion,
  type ExamQuestionDraft,
  type QuestionErrors,
} from '../utils/exam-form';
import { ImportQuestionsPanel } from './ImportQuestionsPanel';

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'] as const;

type QuestionFilter = 'all' | 'incomplete';

interface ExamQuestionsEditorProps {
  open: boolean;
  questions: ExamQuestionDraft[];
  /** Errors by question index from form validation. */
  errors: Record<number, QuestionErrors>;
  /** Question index to focus first when the builder opens. */
  initialIndex?: number;
  onChange: (questions: ExamQuestionDraft[]) => void;
  onClose: () => void;
}

/** Short hint shown on the active question header when the question is not complete yet. */
const describeMissing = (question: ExamQuestionDraft): string => {
  const found = validateQuestion(question);
  if (found.content) return found.content;
  if (found.optionCount) return found.optionCount;
  if (found.options) {
    const first = Object.values(found.options)[0];
    if (first === 'Enter this answer') return 'Fill in all answer choices';
    if (first) return first;
  }
  if (found.correct) return found.correct;
  return 'Complete';
};

/**
 * Dedicated two-column Question Builder window (`max-w-5xl`): a question navigator with live completion
 * status and an "Incomplete" filter on the left, and a spacious single-question editor on the right.
 */
export const ExamQuestionsEditor = ({
  open,
  questions,
  errors,
  initialIndex = 0,
  onChange,
  onClose,
}: ExamQuestionsEditorProps) => {
  const [currentIndex, setCurrentIndex] = useState(() =>
    Math.min(Math.max(initialIndex, 0), Math.max(questions.length - 1, 0)),
  );
  const [filter, setFilter] = useState<QuestionFilter>('all');

  const activeIndex = Math.min(
    currentIndex,
    Math.max(questions.length - 1, 0),
  );
  const question = questions[activeIndex];
  const questionErrors = errors[activeIndex];
  const completeness = questions.map(isQuestionComplete);
  const incompleteCount = completeness.filter((ok) => !ok).length;

  const updateQuestion = (index: number, patch: Partial<ExamQuestionDraft>) =>
    onChange(
      questions.map((item, i) =>
        i === index ? { ...item, ...patch } : item,
      ),
    );
  const updateOption = (index: number, optionIndex: number, text: string) =>
    updateQuestion(index, {
      options: questions[index].options.map((option, i) =>
        i === optionIndex ? text : option,
      ),
    });

  const handleAddQuestion = () => {
    if (questions.length >= EXAM_MAX_QUESTIONS) return;
    const next = [...questions, createEmptyQuestion()];
    onChange(next);
    setCurrentIndex(next.length - 1);
  };

  const handleRemoveQuestion = (index: number) => {
    if (questions.length <= 1) return;
    const next = questions.filter((_, i) => i !== index);
    onChange(next);
    setCurrentIndex((current) => Math.min(current, next.length - 1));
  };

  const visibleIndices = questions
    .map((_, index) => index)
    .filter((index) => filter === 'all' || !completeness[index]);

  return (
    <Modal
      open={open}
      title="Question builder"
      size="xl"
      onClose={onClose}
    >
      <div className="space-y-4">
        <ImportQuestionsPanel
          questions={questions}
          onChange={(next) => {
            onChange(next);
            setFilter('all');
          }}
        />

        <div className="grid h-[35rem] max-h-[65vh] gap-4 md:grid-cols-[17rem_1fr]">
          {/* Left column: question navigator with status indicators and Incomplete filter */}
          <div className="flex h-full min-h-0 flex-col rounded-lg border bg-muted/20 p-3">
            <div className="shrink-0 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Questions ({questions.length}/{EXAM_MAX_QUESTIONS})
                </span>
                <span className="text-xs text-muted-foreground">
                  {questions.length - incompleteCount} complete
                </span>
              </div>

              <div
                role="group"
                aria-label="Filter questions"
                className="grid grid-cols-2 gap-1.5"
              >
                <button
                  type="button"
                  aria-pressed={filter === 'all'}
                  onClick={() => setFilter('all')}
                  className={cn(
                    'rounded-md border px-2.5 py-1 text-xs font-medium',
                    filter === 'all'
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'bg-background text-foreground hover:bg-accent',
                  )}
                >
                  All ({questions.length})
                </button>
                <button
                  type="button"
                  aria-pressed={filter === 'incomplete'}
                  onClick={() => setFilter('incomplete')}
                  className={cn(
                    'rounded-md border px-2.5 py-1 text-xs font-medium',
                    filter === 'incomplete'
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'bg-background text-foreground hover:bg-accent',
                  )}
                >
                  Incomplete ({incompleteCount})
                </button>
              </div>
            </div>

            <div className="mt-3 min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
              {visibleIndices.length === 0 ? (
                <p className="m-0 py-6 text-center text-xs text-muted-foreground">
                  All questions are complete.
                </p>
              ) : (
                visibleIndices.map((index) => {
                  const item = questions[index];
                  const isComplete = completeness[index];
                  const hasError = errors[index] !== undefined;
                  const isCurrent = index === activeIndex;
                  const correctLetter =
                    item.correctIndex !== null
                      ? OPTION_LETTERS[item.correctIndex]
                      : null;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      aria-label={`Question ${index + 1}, ${isComplete ? 'complete' : 'incomplete'}`}
                      aria-current={isCurrent ? 'step' : undefined}
                      onClick={() => setCurrentIndex(index)}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-md border px-2.5 py-2 text-left text-xs transition-colors',
                        isCurrent
                          ? 'border-primary bg-primary/10 font-medium'
                          : 'bg-background hover:bg-accent',
                      )}
                    >
                      {isComplete ? (
                        <CheckCircle2
                          aria-hidden="true"
                          className="h-4 w-4 shrink-0 text-success"
                        />
                      ) : hasError ? (
                        <AlertCircle
                          aria-hidden="true"
                          className="h-4 w-4 shrink-0 text-destructive"
                        />
                      ) : (
                        <Circle
                          aria-hidden="true"
                          className="h-4 w-4 shrink-0 text-muted-foreground"
                        />
                      )}
                      <span className="shrink-0 font-semibold">
                        Q{index + 1}
                      </span>
                      <span className="flex-1 truncate text-muted-foreground">
                        {item.content.trim() || 'Untitled question'}
                      </span>
                      {correctLetter && (
                        <span className="rounded bg-success/15 px-1.5 py-0.5 text-[11px] font-semibold text-success">
                          {correctLetter}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>

            <div className="shrink-0 pt-3">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="w-full"
                disabled={questions.length >= EXAM_MAX_QUESTIONS}
                onClick={handleAddQuestion}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add question
              </Button>
            </div>
          </div>

          {/* Right column: focused editor for the selected question */}
          {question && (
            <div className="flex h-full min-h-0 flex-col rounded-lg border bg-background p-4">
              <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-sm font-semibold">
                    Question {activeIndex + 1} of {questions.length}
                  </span>
                  {completeness[activeIndex] ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-medium text-success">
                      <CheckCircle2 className="h-3 w-3" />
                      Complete
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                      {describeMissing(question)}
                    </span>
                  )}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  aria-label={`Remove question ${activeIndex + 1}`}
                  disabled={questions.length <= 1}
                  onClick={() => handleRemoveQuestion(activeIndex)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="mr-1 h-4 w-4" />
                  Delete question
                </Button>
              </div>

              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto py-3 pr-1">
                <div>
                  <label
                    htmlFor={`question-text-${question.key}`}
                    className="mb-1 block text-xs font-medium text-muted-foreground"
                  >
                    Question text
                  </label>
                  <textarea
                    id={`question-text-${question.key}`}
                    aria-label={`Question ${activeIndex + 1} text`}
                    placeholder="Type the question…"
                    rows={3}
                    maxLength={QUESTION_MAX_LENGTH}
                    value={question.content}
                    onChange={(e) =>
                      updateQuestion(activeIndex, { content: e.target.value })
                    }
                    className="w-full resize-none rounded-md border bg-background p-3 text-sm"
                  />
                  {questionErrors?.content && (
                    <FieldError message={questionErrors.content} />
                  )}
                </div>

                <fieldset className="m-0 min-w-0 space-y-2 border-0 p-0">
                  <legend className="mb-1 p-0 text-xs text-muted-foreground">
                    Answers: select the one that is correct ({MIN_OPTIONS}–
                    {MAX_OPTIONS} answers, exactly one correct)
                  </legend>
                  <div className="space-y-2">
                    {question.options.map((option, optionIndex) => {
                      const letter = OPTION_LETTERS[optionIndex];
                      const isCorrect = question.correctIndex === optionIndex;
                      return (
                        <div key={letter}>
                          <div
                            className={cn(
                              'flex items-center gap-3 rounded-md border px-2.5 py-1.5',
                              isCorrect
                                ? 'border-success/60 bg-success/5'
                                : 'border-transparent bg-muted/20',
                            )}
                          >
                            <input
                              type="radio"
                              name={`correct-${question.key}`}
                              aria-label={`Mark answer ${letter} of question ${activeIndex + 1} as correct`}
                              checked={isCorrect}
                              onChange={() =>
                                updateQuestion(activeIndex, {
                                  correctIndex: optionIndex,
                                })
                              }
                            />
                            <span
                              className={cn(
                                'w-5 text-sm font-semibold',
                                isCorrect && 'text-success',
                              )}
                            >
                              {letter}
                            </span>
                            <Input
                              aria-label={`Answer ${letter} of question ${activeIndex + 1}`}
                              placeholder={`Option ${letter}…`}
                              maxLength={OPTION_MAX_LENGTH}
                              value={option}
                              onChange={(e) =>
                                updateOption(
                                  activeIndex,
                                  optionIndex,
                                  e.target.value,
                                )
                              }
                              className="h-9 flex-1 bg-background"
                            />
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              aria-label={`Remove answer ${letter} of question ${activeIndex + 1}`}
                              disabled={question.options.length <= MIN_OPTIONS}
                              onClick={() =>
                                onChange(
                                  questions.map((q, i) =>
                                    i === activeIndex
                                      ? removeOption(q, optionIndex)
                                      : q,
                                  ),
                                )
                              }
                            >
                              <Trash2 className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </div>
                          {questionErrors?.options?.[optionIndex] && (
                            <div className="pl-12">
                              <FieldError
                                message={questionErrors.options[optionIndex]}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {questionErrors?.optionCount && (
                    <FieldError message={questionErrors.optionCount} />
                  )}
                  {questionErrors?.correct && (
                    <FieldError message={questionErrors.correct} />
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={question.options.length >= MAX_OPTIONS}
                      onClick={() =>
                        onChange(
                          questions.map((q, i) =>
                            i === activeIndex ? addOption(q) : q,
                          ),
                        )
                      }
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      Add answer
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      {question.options.length}/{MAX_OPTIONS} answers
                    </span>
                  </div>
                </fieldset>
              </div>

              <div className="flex shrink-0 items-center justify-between border-t pt-3">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={activeIndex === 0}
                    onClick={() => setCurrentIndex(activeIndex - 1)}
                  >
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={activeIndex >= questions.length - 1}
                    onClick={() => setCurrentIndex(activeIndex + 1)}
                  >
                    Next
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
                <Button type="button" size="sm" onClick={onClose}>
                  Done ({questions.length - incompleteCount}/{questions.length}{' '}
                  complete)
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

const FieldError = ({ message }: { message: string }) => (
  <p role="alert" className="m-0 mt-1 text-xs text-destructive">
    {message}
  </p>
);
