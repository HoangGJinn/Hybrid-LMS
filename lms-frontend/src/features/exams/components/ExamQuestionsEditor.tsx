import { useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Circle,
  CircleDot,
  Copy,
  Plus,
  Scissors,
  Search,
  TextCursorInput,
  Trash2,
  X,
} from 'lucide-react';
import { Modal } from '@shared/components/Modal';
import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import { cn } from '@shared/utils/cn';
import {
  addOption,
  createEmptyQuestion,
  EXAM_MAX_QUESTIONS,
  extractClozePlaceholders,
  isQuestionComplete,
  MAX_BLANKS,
  MAX_OPTIONS,
  MIN_OPTIONS,
  OPTION_MAX_LENGTH,
  QUESTION_MAX_LENGTH,
  removeOption,
  resolveCorrectCount,
  resolveCorrectIndices,
  resolveQuestionType,
  splitBlankVariants,
  switchQuestionType,
  syncBlanksWithContent,
  validateQuestion,
  type ExamQuestionDraft,
  type QuestionErrors,
} from '../utils/exam-form';
import { ImportQuestionsPanel } from './ImportQuestionsPanel';

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'] as const;
const CLOZE_SPLIT_REGEX = /(\{\{\d+\}\})/g;

type StatusFilter = 'all' | 'incomplete';
type TypeFilter = 'all' | 'single' | 'multi' | 'fib';
type VisualMode = 'single' | 'multi' | 'fib';

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

const getVisualMode = (question: ExamQuestionDraft): VisualMode => {
  if (resolveQuestionType(question) === 'FILL_IN_THE_BLANK') return 'fib';
  return resolveCorrectCount(question) > 1 ? 'multi' : 'single';
};

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

const getNextBlankNumber = (content: string): number => {
  const used = new Set(extractClozePlaceholders(content));
  for (let n = 1; n <= MAX_BLANKS; n += 1) {
    if (!used.has(n)) return n;
  }
  return MAX_BLANKS + 1;
};

const renderNavMeta = (
  item: ExamQuestionDraft,
): { typeLabel: string; keyBadge: string | null } => {
  const mode = getVisualMode(item);
  if (mode === 'fib') {
    return {
      typeLabel: `Cloze · ${item.options.length}`,
      keyBadge: `{{1}}${item.options.length > 1 ? `..{{${item.options.length}}}` : ''}`,
    };
  }
  const letters = resolveCorrectIndices(item)
    .map((idx) => OPTION_LETTERS[idx])
    .filter(Boolean);
  const keyBadge = letters.length > 0 ? letters.join(',') : null;
  if (mode === 'multi') {
    return {
      typeLabel: `Pick ${resolveCorrectCount(item)}`,
      keyBadge,
    };
  }
  return {
    typeLabel: '1-Choice',
    keyBadge,
  };
};

/**
 * Spacious two-column Question Builder (`max-w-7xl`):
 * - Top summary bar with live completion progress, type breakdown, and collapsible CSV Import/Export.
 * - Left smart navigator with search, status/type filters, and 2-line question previews.
 * - Right visual editor with 3-mode cards (Single Choice, Multiple Answers, Cloze FIB),
 *   auto-punching `{{N}}` blanks, live student preview, and interactive variant chips.
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
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeIndex = Math.min(
    currentIndex,
    Math.max(questions.length - 1, 0),
  );
  const question = questions[activeIndex];
  const questionErrors = errors[activeIndex];
  const completeness = useMemo(
    () => questions.map(isQuestionComplete),
    [questions],
  );
  const completeCount = completeness.filter(Boolean).length;
  const incompleteCount = questions.length - completeCount;
  const completionPct =
    questions.length > 0
      ? Math.round((completeCount / questions.length) * 100)
      : 0;

  const typeCounts = useMemo(() => {
    let single = 0;
    let multi = 0;
    let fib = 0;
    for (const q of questions) {
      const mode = getVisualMode(q);
      if (mode === 'fib') fib += 1;
      else if (mode === 'multi') multi += 1;
      else single += 1;
    }
    return { single, multi, fib };
  }, [questions]);

  const replaceQuestion = (index: number, nextQuestion: ExamQuestionDraft) =>
    onChange(questions.map((item, i) => (i === index ? nextQuestion : item)));

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
    setStatusFilter('all');
    setTypeFilter('all');
    setSearchQuery('');
    setCurrentIndex(next.length - 1);
  };

  const handleDuplicateQuestion = (index: number) => {
    if (questions.length >= EXAM_MAX_QUESTIONS) return;
    const source = questions[index];
    if (!source) return;
    const clone: ExamQuestionDraft = {
      ...source,
      key: crypto.randomUUID(),
      options: [...source.options],
      correctIndices: source.correctIndices
        ? [...source.correctIndices]
        : undefined,
    };
    const next = [
      ...questions.slice(0, index + 1),
      clone,
      ...questions.slice(index + 1),
    ];
    onChange(next);
    setCurrentIndex(index + 1);
  };

  const handleRemoveQuestion = (index: number) => {
    if (questions.length <= 1) return;
    const next = questions.filter((_, i) => i !== index);
    onChange(next);
    setCurrentIndex((current) => Math.min(current, next.length - 1));
  };

  const handleSelectVisualMode = (mode: VisualMode) => {
    if (!question) return;
    const currentMode = getVisualMode(question);
    if (currentMode === mode) return;

    if (mode === 'fib') {
      replaceQuestion(
        activeIndex,
        switchQuestionType(question, 'FILL_IN_THE_BLANK'),
      );
      return;
    }

    const baseMcq =
      currentMode === 'fib'
        ? switchQuestionType(question, 'MULTIPLE_CHOICE')
        : question;
    if (mode === 'single') {
      const currentIndices = resolveCorrectIndices(baseMcq);
      const firstIndex = currentIndices[0] ?? null;
      replaceQuestion(activeIndex, {
        ...baseMcq,
        type: 'MULTIPLE_CHOICE',
        correctCount: 1,
        correctIndex: firstIndex,
        correctIndices: firstIndex !== null ? [firstIndex] : [],
      });
    } else {
      const currentIndices = resolveCorrectIndices(baseMcq);
      const nextRequired = Math.min(
        baseMcq.options.length,
        Math.max(2, resolveCorrectCount(baseMcq)),
      );
      replaceQuestion(activeIndex, {
        ...baseMcq,
        type: 'MULTIPLE_CHOICE',
        correctCount: nextRequired,
        correctIndex: currentIndices[0] ?? null,
        correctIndices: currentIndices,
      });
    }
  };

  const handlePunchBlank = () => {
    if (!question) return;
    const nextNum = getNextBlankNumber(question.content);
    if (nextNum > MAX_BLANKS) return;

    const el = textareaRef.current;
    const start = el ? el.selectionStart : question.content.length;
    const end = el ? el.selectionEnd : question.content.length;
    const selectedText = question.content.slice(start, end).trim();
    const token = `{{${nextNum}}}`;
    const nextContent =
      question.content.slice(0, start) + token + question.content.slice(end);
    const synced = syncBlanksWithContent(question, nextContent);

    if (selectedText !== '') {
      const nextOptions = [...synced.options];
      const currentSlot = (nextOptions[nextNum - 1] ?? '').trim();
      if (currentSlot === '') {
        nextOptions[nextNum - 1] = selectedText;
      } else {
        const variants = splitBlankVariants(currentSlot);
        if (!variants.includes(selectedText)) {
          nextOptions[nextNum - 1] = `${currentSlot} | ${selectedText}`;
        }
      }
      synced.options = nextOptions;
    }

    replaceQuestion(activeIndex, synced);
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        const caret = start + token.length;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(caret, caret);
      }
    });
  };

  const handleToggleMultiCorrect = (optionIndex: number) => {
    if (!question) return;
    const requiredCorrect = resolveCorrectCount(question);
    const current = resolveCorrectIndices(question);
    const isChecked = current.includes(optionIndex);

    let nextIndices: number[];
    if (isChecked) {
      nextIndices = current.filter((idx) => idx !== optionIndex);
    } else {
      if (current.length >= requiredCorrect) return;
      nextIndices = [...current, optionIndex].sort((a, b) => a - b);
    }
    updateQuestion(activeIndex, {
      type: 'MULTIPLE_CHOICE',
      correctCount: requiredCorrect,
      correctIndices: nextIndices,
      correctIndex: nextIndices[0] ?? null,
    });
  };

  const handleCorrectCountChange = (nextCount: number) => {
    if (!question) return;
    const current = resolveCorrectIndices(question);
    const trimmed =
      current.length > nextCount ? current.slice(0, nextCount) : current;
    updateQuestion(activeIndex, {
      type: 'MULTIPLE_CHOICE',
      correctCount: nextCount,
      correctIndices: trimmed,
      correctIndex: trimmed[0] ?? null,
    });
  };

  const handleRemoveBlankVariant = (blankIndex: number, variantIdx: number) => {
    if (!question) return;
    const variants = splitBlankVariants(question.options[blankIndex] ?? '');
    const remaining = variants.filter((_, idx) => idx !== variantIdx);
    updateOption(activeIndex, blankIndex, remaining.join(' | '));
  };

  const visibleIndices = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return questions
      .map((_, index) => index)
      .filter((index) => {
        if (statusFilter === 'incomplete' && completeness[index]) return false;
        const mode = getVisualMode(questions[index]);
        if (typeFilter !== 'all' && mode !== typeFilter) return false;
        if (query !== '') {
          const item = questions[index];
          const numMatch = `q${index + 1}`.includes(query) || String(index + 1) === query;
          const textMatch =
            item.content.toLowerCase().includes(query) ||
            item.options.some((opt) => opt.toLowerCase().includes(query));
          if (!numMatch && !textMatch) return false;
        }
        return true;
      });
  }, [completeness, questions, searchQuery, statusFilter, typeFilter]);

  const activeMode: VisualMode = question
    ? getVisualMode(question)
    : 'single';
  const nextBlankNumber = question
    ? getNextBlankNumber(question.content)
    : 1;
  const activeRequiredCorrect = question ? resolveCorrectCount(question) : 1;
  const activeSelectedIndices = question ? resolveCorrectIndices(question) : [];

  return (
    <Modal
      open={open}
      title="Question builder"
      size="2xl"
      onClose={onClose}
    >
      <div className="space-y-3">
        {/* Top Smart Summary + Compact CSV Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/20 px-4 py-2.5">
          <div className="flex flex-wrap items-center gap-4">
            <div className="min-w-44 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground">
                  {completeCount}/{questions.length} ready
                </span>
                <span className="text-muted-foreground">{completionPct}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    'h-full transition-all',
                    incompleteCount === 0 ? 'bg-success' : 'bg-primary',
                  )}
                  style={{ width: `${completionPct}%` }}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="rounded-full border bg-background px-2.5 py-0.5 font-medium text-foreground">
                Single: {typeCounts.single}
              </span>
              <span className="rounded-full border bg-background px-2.5 py-0.5 font-medium text-foreground">
                Multi-answer: {typeCounts.multi}
              </span>
              <span className="rounded-full border bg-background px-2.5 py-0.5 font-medium text-foreground">
                Cloze (FIB): {typeCounts.fib}
              </span>
            </div>
          </div>

          <div className="flex-1 sm:max-w-xl">
            <ImportQuestionsPanel
              compact
              questions={questions}
              onChange={(next) => {
                onChange(next);
                setStatusFilter('all');
                setTypeFilter('all');
                setSearchQuery('');
              }}
            />
          </div>
        </div>

        {/* Main Spacious Two-Column Workspace */}
        <div className="grid h-[44rem] max-h-[76vh] gap-5 md:grid-cols-[22rem_1fr]">
          {/* Left column: Smart Question Navigator */}
          <div className="flex h-full min-h-0 flex-col rounded-xl border bg-muted/20 p-3.5">
            <div className="shrink-0 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Questions ({questions.length}/{EXAM_MAX_QUESTIONS})
                </span>
                <span className="text-xs text-muted-foreground">
                  {incompleteCount === 0
                    ? 'All ready'
                    : `${incompleteCount} incomplete`}
                </span>
              </div>

              {/* Search box */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search questions or Q#…"
                  aria-label="Search questions in builder"
                  className="h-8 bg-background pl-8 pr-7 text-xs"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear question search"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Status filters */}
              <div
                role="group"
                aria-label="Filter questions by completion"
                className="grid grid-cols-2 gap-1.5"
              >
                <button
                  type="button"
                  aria-pressed={statusFilter === 'all'}
                  onClick={() => setStatusFilter('all')}
                  className={cn(
                    'rounded-md border px-2.5 py-1 text-xs font-medium',
                    statusFilter === 'all'
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'bg-background text-foreground hover:bg-accent',
                  )}
                >
                  All ({questions.length})
                </button>
                <button
                  type="button"
                  aria-pressed={statusFilter === 'incomplete'}
                  onClick={() => setStatusFilter('incomplete')}
                  className={cn(
                    'rounded-md border px-2.5 py-1 text-xs font-medium',
                    statusFilter === 'incomplete'
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'bg-background text-foreground hover:bg-accent',
                  )}
                >
                  Incomplete ({incompleteCount})
                </button>
              </div>

              {/* Type filter pills */}
              <div
                role="group"
                aria-label="Filter questions by type"
                className="flex flex-wrap gap-1"
              >
                {(
                  [
                    ['all', 'All types'],
                    ['single', 'Single'],
                    ['multi', 'Multi'],
                    ['fib', 'Cloze'],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={typeFilter === key}
                    onClick={() => setTypeFilter(key)}
                    className={cn(
                      'rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors',
                      typeFilter === key
                        ? 'border-brand bg-brand/15 text-brand'
                        : 'bg-background text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable Question Cards */}
            <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
              {visibleIndices.length === 0 ? (
                <p className="m-0 py-8 text-center text-xs text-muted-foreground">
                  No questions match the current filters.
                </p>
              ) : (
                visibleIndices.map((index) => {
                  const item = questions[index];
                  const isComplete = completeness[index];
                  const hasError = errors[index] !== undefined;
                  const isCurrent = index === activeIndex;
                  const meta = renderNavMeta(item);
                  return (
                    <button
                      key={item.key}
                      type="button"
                      aria-label={`Question ${index + 1}, ${isComplete ? 'complete' : 'incomplete'}`}
                      aria-current={isCurrent ? 'step' : undefined}
                      onClick={() => setCurrentIndex(index)}
                      className={cn(
                        'w-full space-y-1 rounded-lg border px-3 py-2.5 text-left transition-colors',
                        isCurrent
                          ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                          : 'bg-background hover:bg-accent/60',
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          {isComplete ? (
                            <CheckCircle2
                              aria-hidden="true"
                              className="h-3.5 w-3.5 shrink-0 text-success"
                            />
                          ) : hasError ? (
                            <AlertCircle
                              aria-hidden="true"
                              className="h-3.5 w-3.5 shrink-0 text-destructive"
                            />
                          ) : (
                            <Circle
                              aria-hidden="true"
                              className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                            />
                          )}
                          <span className="text-xs font-bold text-foreground">
                            Q{index + 1}
                          </span>
                          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                            {meta.typeLabel}
                          </span>
                        </div>
                        {meta.keyBadge && (
                          <span className="max-w-20 truncate rounded bg-success/15 px-1.5 py-0.5 text-[10px] font-semibold text-success">
                            {meta.keyBadge}
                          </span>
                        )}
                      </div>
                      <p className="m-0 line-clamp-2 text-xs text-muted-foreground">
                        {item.content.trim() || 'Untitled question'}
                      </p>
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
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add new question
              </Button>
            </div>
          </div>

          {/* Right column: Spacious & Visual Question Editor */}
          {question && (
            <div className="flex h-full min-h-0 flex-col rounded-xl border bg-background p-5 shadow-xs">
              {/* Editor Top Bar */}
              <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b pb-3">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-base font-semibold">
                    Question {activeIndex + 1} of {questions.length}
                  </span>
                  {completeness[activeIndex] ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-medium text-success">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Ready
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2.5 py-0.5 text-xs font-medium text-warning">
                      {describeMissing(question)}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={questions.length >= EXAM_MAX_QUESTIONS}
                    onClick={() => handleDuplicateQuestion(activeIndex)}
                  >
                    <Copy className="mr-1.5 h-3.5 w-3.5" />
                    Duplicate
                  </Button>
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
                    Delete
                  </Button>
                </div>
              </div>

              {/* Scrollable Editor Body */}
              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto py-4 pr-1">
                {/* Visual 3-Mode Question Type Selector */}
                <div>
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Question format
                  </span>
                  <div
                    role="group"
                    aria-label="Question type"
                    className="grid gap-2.5 sm:grid-cols-3"
                  >
                    <ModeCard
                      active={activeMode === 'single'}
                      icon={<CircleDot className="h-4 w-4" />}
                      title="Single Choice"
                      description="1 correct answer out of 2–6"
                      onClick={() => handleSelectVisualMode('single')}
                    />
                    <ModeCard
                      active={activeMode === 'multi'}
                      icon={<CheckSquare className="h-4 w-4" />}
                      title="Multiple Answers"
                      description="Choose exact N correct answers"
                      onClick={() => handleSelectVisualMode('multi')}
                    />
                    <ModeCard
                      active={activeMode === 'fib'}
                      icon={<TextCursorInput className="h-4 w-4" />}
                      title="Fill in the Blank (Cloze)"
                      description="Punched {{1}}..{{6}} blanks"
                      onClick={() => handleSelectVisualMode('fib')}
                    />
                  </div>
                </div>

                {/* Question text + Cloze blank punching toolbar */}
                <div>
                  <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <label
                        htmlFor={`question-text-${question.key}`}
                        className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                      >
                        Question stem
                      </label>
                      <span className="text-[11px] text-muted-foreground">
                        ({question.content.length}/{QUESTION_MAX_LENGTH})
                      </span>
                    </div>

                    {activeMode === 'fib' && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={nextBlankNumber > MAX_BLANKS}
                        onClick={handlePunchBlank}
                        className="h-8 border-primary/40 bg-primary/5 px-3 text-xs font-medium text-primary hover:bg-primary/10"
                      >
                        <Scissors className="mr-1.5 h-3.5 w-3.5" />
                        {nextBlankNumber <= MAX_BLANKS
                          ? `Punch blank {{${nextBlankNumber}}}`
                          : `Max ${MAX_BLANKS} blanks`}
                      </Button>
                    )}
                  </div>

                  {activeMode === 'fib' && (
                    <p className="mb-2 mt-0 text-xs text-muted-foreground">
                      Highlight any word or phrase below and click{' '}
                      <strong className="text-foreground">Punch blank</strong>{' '}
                      to turn it into <code>{'{{1}}'}</code>,{' '}
                      <code>{'{{2}}'}</code>… and auto-fill its answer, or type
                      placeholders directly.
                    </p>
                  )}

                  <textarea
                    ref={textareaRef}
                    id={`question-text-${question.key}`}
                    aria-label={`Question ${activeIndex + 1} text`}
                    placeholder={
                      activeMode === 'fib'
                        ? 'Example: Thủ đô của {{1}} là thành phố {{2}}.'
                        : 'Type your question prompt here…'
                    }
                    rows={4}
                    maxLength={QUESTION_MAX_LENGTH}
                    value={question.content}
                    onChange={(e) => {
                      if (activeMode === 'fib') {
                        replaceQuestion(
                          activeIndex,
                          syncBlanksWithContent(question, e.target.value),
                        );
                      } else {
                        updateQuestion(activeIndex, {
                          content: e.target.value,
                        });
                      }
                    }}
                    className="w-full resize-y rounded-lg border bg-background p-3.5 text-sm leading-relaxed focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  {questionErrors?.content && (
                    <FieldError message={questionErrors.content} />
                  )}

                  {activeMode === 'fib' && question.content.trim() !== '' && (
                    <ClozePreviewBox
                      content={question.content}
                      blanks={question.options}
                    />
                  )}
                </div>

                {activeMode === 'fib' ? (
                  <FillBlankAnswersEditor
                    questionIndex={activeIndex}
                    blanks={question.options}
                    errors={questionErrors}
                    onUpdateBlank={(blankIndex, value) =>
                      updateOption(activeIndex, blankIndex, value)
                    }
                    onRemoveVariant={handleRemoveBlankVariant}
                  />
                ) : (
                  <fieldset className="m-0 min-w-0 space-y-3 border-0 p-0">
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/20 px-3.5 py-2.5">
                      <legend className="m-0 p-0 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Answer choices ({question.options.length}/{MAX_OPTIONS})
                      </legend>

                      {activeMode === 'multi' ? (
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <label
                            htmlFor={`correct-count-${question.key}`}
                            className="font-medium text-muted-foreground"
                          >
                            Required correct answers:
                          </label>
                          <select
                            id={`correct-count-${question.key}`}
                            aria-label={`Correct answers required for question ${activeIndex + 1}`}
                            value={activeRequiredCorrect}
                            onChange={(e) =>
                              handleCorrectCountChange(Number(e.target.value))
                            }
                            className="h-8 rounded-md border bg-background px-2.5 text-xs font-semibold"
                          >
                            {question.options.map((_, idx) => {
                              const count = idx + 1;
                              return (
                                <option key={count} value={count}>
                                  {count}{' '}
                                  {count === 1 ? 'answer' : 'answers'}
                                </option>
                              );
                            })}
                          </select>
                          <span
                            className={cn(
                              'rounded-full px-2.5 py-0.5 text-xs font-semibold',
                              activeSelectedIndices.length ===
                                activeRequiredCorrect
                                ? 'bg-success/15 text-success'
                                : 'bg-warning/15 text-warning',
                            )}
                          >
                            {activeSelectedIndices.length}/
                            {activeRequiredCorrect} marked
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Click a radio or letter badge to set the 1 correct
                          answer
                        </span>
                      )}
                    </div>

                    <div className="space-y-2.5">
                      {question.options.map((option, optionIndex) => {
                        const letter = OPTION_LETTERS[optionIndex];
                        const isCorrect =
                          activeSelectedIndices.includes(optionIndex);
                        const isMulti = activeRequiredCorrect > 1;
                        const isSelectionCapped =
                          isMulti &&
                          !isCorrect &&
                          activeSelectedIndices.length >= activeRequiredCorrect;
                        return (
                          <div key={letter}>
                            <div
                              className={cn(
                                'flex items-center gap-3 rounded-lg border px-3 py-2 transition-colors',
                                isCorrect
                                  ? 'border-success bg-success/10'
                                  : 'bg-muted/15 hover:bg-muted/30',
                              )}
                            >
                              {isMulti ? (
                                <input
                                  type="checkbox"
                                  aria-label={`Mark answer ${letter} of question ${activeIndex + 1} as correct`}
                                  checked={isCorrect}
                                  disabled={isSelectionCapped}
                                  onChange={() =>
                                    handleToggleMultiCorrect(optionIndex)
                                  }
                                  className="h-4 w-4 cursor-pointer accent-success"
                                />
                              ) : (
                                <input
                                  type="radio"
                                  name={`correct-${question.key}`}
                                  aria-label={`Mark answer ${letter} of question ${activeIndex + 1} as correct`}
                                  checked={isCorrect}
                                  onChange={() =>
                                    updateQuestion(activeIndex, {
                                      type: 'MULTIPLE_CHOICE',
                                      correctCount: 1,
                                      correctIndex: optionIndex,
                                      correctIndices: [optionIndex],
                                    })
                                  }
                                  className="h-4 w-4 cursor-pointer accent-success"
                                />
                              )}
                              <button
                                type="button"
                                disabled={isSelectionCapped}
                                onClick={() => {
                                  if (isMulti) {
                                    handleToggleMultiCorrect(optionIndex);
                                  } else {
                                    updateQuestion(activeIndex, {
                                      type: 'MULTIPLE_CHOICE',
                                      correctCount: 1,
                                      correctIndex: optionIndex,
                                      correctIndices: [optionIndex],
                                    });
                                  }
                                }}
                                className={cn(
                                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-md border text-xs font-bold transition-colors',
                                  isCorrect
                                    ? 'border-success bg-success text-success-foreground'
                                    : 'bg-background text-foreground',
                                  isSelectionCapped &&
                                    'cursor-not-allowed opacity-50',
                                )}
                              >
                                {letter}
                              </button>
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
                                className="h-10 flex-1 bg-background text-sm"
                              />
                              {isCorrect && (
                                <span className="hidden rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-semibold text-success sm:inline-block">
                                  Correct
                                </span>
                              )}
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                aria-label={`Remove answer ${letter} of question ${activeIndex + 1}`}
                                disabled={
                                  question.options.length <= MIN_OPTIONS
                                }
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
                        <Plus className="mr-1 h-3.5 w-3.5" />
                        Add option
                      </Button>
                      <span className="text-xs text-muted-foreground">
                        {question.options.length}/{MAX_OPTIONS} options
                      </span>
                    </div>
                  </fieldset>
                )}
              </div>

              {/* Editor Footer */}
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
                  Done ({completeCount}/{questions.length} ready)
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

const ModeCard = ({
  active,
  icon,
  title,
  description,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    aria-pressed={active}
    onClick={onClick}
    className={cn(
      'flex items-start gap-2.5 rounded-lg border p-3 text-left transition-colors',
      active
        ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
        : 'bg-muted/15 hover:border-primary/40 hover:bg-muted/30',
    )}
  >
    <span
      className={cn(
        'mt-0.5 shrink-0',
        active ? 'text-primary' : 'text-muted-foreground',
      )}
    >
      {icon}
    </span>
    <span className="min-w-0">
      <span className="block text-xs font-semibold text-foreground">
        {title}
      </span>
      <span className="block text-[11px] text-muted-foreground">
        {description}
      </span>
    </span>
  </button>
);

const ClozePreviewBox = ({
  content,
  blanks,
}: {
  content: string;
  blanks: readonly string[];
}) => {
  const parts = content.split(CLOZE_SPLIT_REGEX);
  return (
    <div className="mt-2.5 rounded-lg border bg-muted/20 p-3 text-sm">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Student view preview
      </span>
      <p className="m-0 leading-loose text-foreground">
        {parts.map((part, idx) => {
          const match = /^\{\{(\d+)\}\}$/.exec(part);
          if (!match) return <span key={idx}>{part}</span>;
          const num = Number(match[1]);
          const variants = splitBlankVariants(blanks[num - 1] ?? '');
          const hasAnswer = variants.length > 0;
          return (
            <span
              key={idx}
              className={cn(
                'mx-1 inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-semibold',
                hasAnswer
                  ? 'border-success/60 bg-success/10 text-success'
                  : 'border-warning/60 bg-warning/10 text-warning',
              )}
            >
              <span className="text-[10px] font-bold">({num})</span>
              <span>{variants[0] || 'Missing answer'}</span>
              {variants.length > 1 && (
                <span className="rounded bg-success/20 px-1 text-[10px]">
                  +{variants.length - 1}
                </span>
              )}
            </span>
          );
        })}
      </p>
    </div>
  );
};

const FillBlankAnswersEditor = ({
  questionIndex,
  blanks,
  errors,
  onUpdateBlank,
  onRemoveVariant,
}: {
  questionIndex: number;
  blanks: readonly string[];
  errors?: QuestionErrors;
  onUpdateBlank: (blankIndex: number, value: string) => void;
  onRemoveVariant: (blankIndex: number, variantIdx: number) => void;
}) => (
  <fieldset className="m-0 min-w-0 space-y-3 border-0 p-0">
    <div className="rounded-lg border bg-muted/20 px-3.5 py-2.5">
      <legend className="m-0 p-0 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Acceptable answers per blank ({blanks.length}/{MAX_BLANKS} blanks)
      </legend>
      <p className="mb-0 mt-1 text-xs text-muted-foreground">
        Separate multiple acceptable variants with <code>|</code> (e.g.{' '}
        <code>Hà Nội | Ha Noi | Hanoi</code>). Matching is case-insensitive and
        ignores extra spaces.
      </p>
    </div>
    <div className="space-y-2.5">
      {blanks.map((blankValue, blankIndex) => {
        const variants = splitBlankVariants(blankValue);
        const blankNum = blankIndex + 1;
        return (
          <div
            key={blankNum}
            className={cn(
              'rounded-lg border p-3 transition-colors',
              variants.length > 0
                ? 'border-success/40 bg-success/5'
                : 'bg-muted/15',
            )}
          >
            <div className="flex items-center gap-2.5">
              <span className="shrink-0 rounded-md bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
                {`Blank {{${blankNum}}}`}
              </span>
              <Input
                aria-label={`Blank ${blankNum} acceptable answers for question ${questionIndex + 1}`}
                placeholder={`Answer for {{${blankNum}}}, separate variants with |`}
                maxLength={OPTION_MAX_LENGTH}
                value={blankValue}
                onChange={(e) => onUpdateBlank(blankIndex, e.target.value)}
                className="h-10 flex-1 bg-background text-sm"
              />
              <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
                {variants.length}{' '}
                {variants.length === 1 ? 'variant' : 'variants'}
              </span>
            </div>
            {variants.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-1">
                <span className="text-[11px] text-muted-foreground">
                  Accepted:
                </span>
                {variants.map((variant, vIdx) => (
                  <span
                    key={`${vIdx}-${variant}`}
                    className="inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/15 px-2.5 py-0.5 text-xs font-medium text-success"
                  >
                    <span>{variant}</span>
                    <button
                      type="button"
                      aria-label={`Remove variant ${variant} from blank ${blankNum}`}
                      onClick={() => onRemoveVariant(blankIndex, vIdx)}
                      className="rounded-full p-0.5 hover:bg-success/20"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            {errors?.options?.[blankIndex] && (
              <div className="mt-1">
                <FieldError message={errors.options[blankIndex]} />
              </div>
            )}
          </div>
        );
      })}
    </div>
    {errors?.optionCount && <FieldError message={errors.optionCount} />}
  </fieldset>
);

const FieldError = ({ message }: { message: string }) => (
  <p role="alert" className="m-0 mt-1 text-xs text-destructive">
    {message}
  </p>
);
