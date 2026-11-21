import { validateExamFile } from '@features/documents';
import type {
  ExamFormat,
  ExamQuestion,
  ExamQuestionType,
  LecturerExam,
  NewExamInput,
  NewExamQuestion,
} from '../types/exams.types';

/** Mirrors the limits in the backend's exam-rules.constant.ts, so a form is rejected before anything is sent. */
export const EXAM_NAME_MAX_LENGTH = 255;
export const EXAM_MAX_QUESTIONS = 100;
export const QUESTION_MAX_LENGTH = 2000;
export const OPTION_MAX_LENGTH = 500;
/** A multiple-choice question has between these many options, with 1 or more marked correct. */
export const MIN_OPTIONS = 2;
export const MAX_OPTIONS = 6;
/** A fill-in-the-blank question has between 1 and 6 numbered blanks (`{{1}}`..`{{6}}`). */
export const MIN_BLANKS = 1;
export const MAX_BLANKS = 6;
export const BLANK_VARIANT_SEPARATOR = '|';
/** How many empty answers a new question starts with. */
export const DEFAULT_OPTIONS = 4;
export const MIN_DURATION_MINUTES = 1;
export const MAX_DURATION_MINUTES = 480;
export const MIN_ATTEMPTS = 1;
export const MAX_ATTEMPTS = 100;

const MS_PER_MINUTE = 60_000;
const CLOZE_PLACEHOLDER_REGEX = /\{\{(\d+)\}\}/g;

/** A question being typed; `key` keeps the list stable while questions are added and removed. */
export interface ExamQuestionDraft {
  key: string;
  type?: ExamQuestionType;
  content: string;
  /**
   * For `MULTIPLE_CHOICE`: between `MIN_OPTIONS` and `MAX_OPTIONS` option texts.
   * For `FILL_IN_THE_BLANK`: between `MIN_BLANKS` and `MAX_BLANKS` pipe-separated acceptable answer strings (`a | b`).
   */
  options: string[];
  /** Primary/single correct option index; `null` until the lecturer picks one. */
  correctIndex: number | null;
  /** All selected correct option indices for `MULTIPLE_CHOICE` (sorted ascending). */
  correctIndices?: number[];
  /** Configured correct answer count for `MULTIPLE_CHOICE` (1..options.length), or blank count for `FILL_IN_THE_BLANK`. */
  correctCount?: number;
}

export interface ExamFormValues {
  examName: string;
  /** Value of an `<input type="datetime-local">`, for example `2026-10-01T08:00`. */
  startTime: string;
  endTime: string;
  /** Kept as typed so an empty or half-typed field can be reported. */
  durationMinutes: string;
  format: ExamFormat;
  /** True when attempts are unlimited (`maxAttempts = null`); false when limited by `maxAttempts` text. */
  unlimitedAttempts?: boolean;
  /** Kept as typed when `unlimitedAttempts` is false (e.g. `'1'`). */
  maxAttempts?: string;
  showResults?: boolean;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
  questions: ExamQuestionDraft[];
  file: File | null;
}

export interface QuestionErrors {
  content?: string;
  /** By option / blank index. */
  options?: Record<number, string>;
  /** About the number of answers or blank slots. */
  optionCount?: string;
  correct?: string;
}

export interface ExamFormErrors {
  examName?: string;
  startTime?: string;
  endTime?: string;
  durationMinutes?: string;
  maxAttempts?: string;
  /** About the list as a whole, e.g. "Add at least one question". */
  questions?: string;
  /** By question index. */
  questionErrors: Record<number, QuestionErrors>;
  file?: string;
}

export type ClozeValidationResult =
  | { readonly valid: true; readonly count: number }
  | { readonly valid: false; readonly reason: string };

/** Extracts placeholder numbers (`{{1}}`, `{{2}}`, ...) in appearance order. */
export const extractClozePlaceholders = (content: string): number[] => {
  const numbers: number[] = [];
  for (const match of content.matchAll(CLOZE_PLACEHOLDER_REGEX)) {
    numbers.push(Number(match[1]));
  }
  return numbers;
};

/** Validates that a fill-in-the-blank stem contains unique sequential placeholders `{{1}}..{{k}}` (`1 <= k <= 6`). */
export const validateClozePlaceholders = (
  content: string,
): ClozeValidationResult => {
  const numbers = extractClozePlaceholders(content);
  if (numbers.length === 0) {
    return {
      valid: false,
      reason:
        'Include at least one blank placeholder like {{1}} in the question text',
    };
  }
  const seen = new Set<number>();
  for (const num of numbers) {
    if (seen.has(num)) {
      return {
        valid: false,
        reason: `Duplicate blank placeholder {{${num}}} found`,
      };
    }
    seen.add(num);
  }
  const sorted = [...seen].sort((a, b) => a - b);
  for (let i = 0; i < sorted.length; i += 1) {
    if (sorted[i] !== i + 1) {
      return {
        valid: false,
        reason:
          'Blank placeholders must be numbered sequentially starting from {{1}} (e.g., {{1}}, {{2}})',
      };
    }
  }
  if (sorted.length > MAX_BLANKS) {
    return {
      valid: false,
      reason: `At most ${MAX_BLANKS} blanks are allowed per question`,
    };
  }
  return { valid: true, count: sorted.length };
};

/** Normalizes a student or key blank text answer (case-insensitive, trimmed, collapsed whitespace). */
export const normalizeBlankAnswer = (value: string): string =>
  value.trim().replace(/\s+/g, ' ').toLowerCase();

/** Splits pipe-separated acceptable variants (`a | b`) into trimmed non-empty strings. */
export const splitBlankVariants = (rawContent: string): string[] =>
  rawContent
    .split(BLANK_VARIANT_SEPARATOR)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

export const resolveQuestionType = (
  question: Pick<ExamQuestionDraft, 'type'>,
): ExamQuestionType => question.type ?? 'MULTIPLE_CHOICE';

export const resolveCorrectIndices = (
  question: Pick<ExamQuestionDraft, 'correctIndex' | 'correctIndices'>,
): number[] => {
  if (question.correctIndices !== undefined) return question.correctIndices;
  if (question.correctIndex !== null) return [question.correctIndex];
  return [];
};

export const resolveCorrectCount = (question: ExamQuestionDraft): number => {
  if (resolveQuestionType(question) === 'FILL_IN_THE_BLANK') {
    return Math.max(MIN_BLANKS, question.options.length);
  }
  return (
    question.correctCount ??
    Math.max(1, resolveCorrectIndices(question).length)
  );
};

export const createEmptyQuestion = (): ExamQuestionDraft => ({
  key: crypto.randomUUID(),
  content: '',
  options: Array.from({ length: DEFAULT_OPTIONS }, () => ''),
  correctIndex: null,
});

/** Synchronizes a fill-in-the-blank question's blank slots with `{{1}}..{{k}}` placeholders in `newContent`. */
export const syncBlanksWithContent = (
  question: ExamQuestionDraft,
  newContent: string,
): ExamQuestionDraft => {
  const numbers = extractClozePlaceholders(newContent).filter(
    (num) => num >= MIN_BLANKS && num <= MAX_BLANKS,
  );
  const uniqueCount = new Set(numbers).size;
  const maxNum = numbers.length > 0 ? Math.max(...numbers) : 0;
  const targetCount = Math.min(
    MAX_BLANKS,
    Math.max(MIN_BLANKS, uniqueCount, maxNum),
  );
  const nextOptions = Array.from(
    { length: targetCount },
    (_, idx) => question.options[idx] ?? '',
  );
  return {
    ...question,
    type: 'FILL_IN_THE_BLANK',
    content: newContent,
    options: nextOptions,
    correctIndex: 0,
    correctIndices: Array.from({ length: targetCount }, (_, idx) => idx),
    correctCount: targetCount,
  };
};

/** Switches a draft between `MULTIPLE_CHOICE` and `FILL_IN_THE_BLANK`, resetting option/blank slots cleanly. */
export const switchQuestionType = (
  question: ExamQuestionDraft,
  nextType: ExamQuestionType,
): ExamQuestionDraft => {
  if (resolveQuestionType(question) === nextType) return question;
  if (nextType === 'FILL_IN_THE_BLANK') {
    return syncBlanksWithContent(
      { ...question, type: 'FILL_IN_THE_BLANK', options: [''] },
      question.content,
    );
  }
  return {
    key: question.key,
    type: 'MULTIPLE_CHOICE',
    content: question.content,
    options: Array.from({ length: DEFAULT_OPTIONS }, () => ''),
    correctIndex: null,
    correctIndices: [],
    correctCount: 1,
  };
};

/** Turns an existing exam's questions into editor drafts; starts with one empty question for a FILE exam. */
export const toDraftQuestions = (
  questions: ExamQuestion[],
): ExamQuestionDraft[] => {
  if (questions.length === 0) return [createEmptyQuestion()];
  return questions.map((question) => {
    const type = question.type ?? 'MULTIPLE_CHOICE';
    const correctIndices = question.options.reduce<number[]>(
      (acc, option, index) => {
        if (option.isCorrect) acc.push(index);
        return acc;
      },
      [],
    );
    const correctIndex = correctIndices[0] ?? null;
    if (
      type === 'MULTIPLE_CHOICE' &&
      question.type === undefined &&
      question.correctCount === undefined &&
      correctIndices.length <= 1
    ) {
      return {
        key: question.id,
        content: question.content,
        options: question.options.map((option) => option.content),
        correctIndex,
      };
    }
    const correctCount =
      question.correctCount ??
      (type === 'FILL_IN_THE_BLANK'
        ? Math.max(MIN_BLANKS, question.options.length)
        : Math.max(1, correctIndices.length));
    return {
      key: question.id,
      type,
      content: question.content,
      options: question.options.map((option) => option.content),
      correctIndex,
      correctIndices,
      correctCount,
    };
  });
};

/** Adds one empty answer; a question that already has `MAX_OPTIONS` is returned unchanged. */
export const addOption = (question: ExamQuestionDraft): ExamQuestionDraft =>
  question.options.length >= MAX_OPTIONS
    ? question
    : { ...question, options: [...question.options, ''] };

/**
 * Removes one answer; a question that only has `MIN_OPTIONS` is returned unchanged. The correct answer(s)
 * follow their text: indices shift up when an earlier answer goes, and are cleared when removed.
 */
export const removeOption = (
  question: ExamQuestionDraft,
  optionIndex: number,
): ExamQuestionDraft => {
  if (question.options.length <= MIN_OPTIONS) return question;
  const nextOptions = question.options.filter((_, i) => i !== optionIndex);
  const { correctIndex } = question;
  let nextCorrect = correctIndex;
  if (correctIndex === optionIndex) nextCorrect = null;
  else if (correctIndex !== null && correctIndex > optionIndex)
    nextCorrect = correctIndex - 1;

  const updated: ExamQuestionDraft = {
    ...question,
    options: nextOptions,
    correctIndex: nextCorrect,
  };
  if (question.correctIndices !== undefined) {
    const nextIndices = question.correctIndices
      .filter((idx) => idx !== optionIndex)
      .map((idx) => (idx > optionIndex ? idx - 1 : idx));
    updated.correctIndices = nextIndices;
    updated.correctIndex = nextIndices[0] ?? null;
  }
  if (question.correctCount !== undefined) {
    updated.correctCount = Math.min(question.correctCount, nextOptions.length);
  }
  return updated;
};

export const hasExamFormErrors = (errors: ExamFormErrors): boolean =>
  Object.entries(errors).some(([name, value]) =>
    name === 'questionErrors'
      ? Object.keys(value as object).length > 0
      : value !== undefined,
  );

const normalize = (text: string): string => text.trim().toLowerCase();

/** Checks one question; an empty object means the question is ready to save. */
export const validateQuestion = (question: ExamQuestionDraft): QuestionErrors => {
  const errors: QuestionErrors = {};
  const content = question.content.trim();
  if (content === '') errors.content = 'Enter the question';
  else if (content.length > QUESTION_MAX_LENGTH)
    errors.content = `The question can have at most ${QUESTION_MAX_LENGTH} characters`;

  const type = resolveQuestionType(question);
  const optionErrors: Record<number, string> = {};

  if (type === 'FILL_IN_THE_BLANK') {
    if (content !== '' && !errors.content) {
      const placeholderCheck = validateClozePlaceholders(content);
      if (!placeholderCheck.valid) {
        errors.content = placeholderCheck.reason;
      } else if (question.options.length !== placeholderCheck.count) {
        errors.optionCount = `This question has ${placeholderCheck.count} blank(s) in the text but ${question.options.length} answer slot(s)`;
      }
    }
    question.options.forEach((option, index) => {
      const text = option.trim();
      if (text === '' || splitBlankVariants(text).length === 0) {
        optionErrors[index] =
          `Enter acceptable answer(s) for blank {{${index + 1}}}`;
      } else if (text.length > OPTION_MAX_LENGTH) {
        optionErrors[index] = `At most ${OPTION_MAX_LENGTH} characters`;
      }
    });
    if (Object.keys(optionErrors).length > 0) errors.options = optionErrors;
    return errors;
  }

  const seen = new Set<string>();
  if (
    question.options.length < MIN_OPTIONS ||
    question.options.length > MAX_OPTIONS
  )
    errors.optionCount = `A question needs ${MIN_OPTIONS} to ${MAX_OPTIONS} answers`;
  question.options.forEach((option, index) => {
    const text = option.trim();
    if (text === '') optionErrors[index] = 'Enter this answer';
    else if (text.length > OPTION_MAX_LENGTH)
      optionErrors[index] = `At most ${OPTION_MAX_LENGTH} characters`;
    else if (seen.has(normalize(text)))
      optionErrors[index] = 'This answer repeats another one';
    if (text !== '') seen.add(normalize(text));
  });
  if (Object.keys(optionErrors).length > 0) errors.options = optionErrors;

  const requiredCorrect = resolveCorrectCount(question);
  const selectedIndices = resolveCorrectIndices(question);
  if (requiredCorrect > question.options.length) {
    errors.correct = 'Number of correct answers cannot exceed total options';
  } else if (requiredCorrect === 1) {
    if (selectedIndices.length !== 1) {
      errors.correct = 'Choose the correct answer';
    }
  } else if (selectedIndices.length !== requiredCorrect) {
    errors.correct = `Select exactly ${requiredCorrect} correct answers (${selectedIndices.length}/${requiredCorrect} selected)`;
  }
  return errors;
};

/** True when the question has its text, valid options/blanks, and complete correct answers. */
export const isQuestionComplete = (question: ExamQuestionDraft): boolean =>
  Object.keys(validateQuestion(question)).length === 0;

/** Parses the typed duration; `null` when it is not a whole number in the allowed range. */
const parseDuration = (text: string): number | null => {
  const value = Number(text.trim());
  const isValid =
    text.trim() !== '' &&
    Number.isInteger(value) &&
    value >= MIN_DURATION_MINUTES &&
    value <= MAX_DURATION_MINUTES;
  return isValid ? value : null;
};

/** Parses the typed maxAttempts when not unlimited; `null` when invalid. */
const parseMaxAttempts = (text: string): number | null => {
  const value = Number(text.trim());
  const isValid =
    text.trim() !== '' &&
    Number.isInteger(value) &&
    value >= MIN_ATTEMPTS &&
    value <= MAX_ATTEMPTS;
  return isValid ? value : null;
};

const resolveMaxAttempts = (values: ExamFormValues): number | null => {
  if (values.unlimitedAttempts) return null;
  if (values.maxAttempts === undefined) return 1;
  return parseMaxAttempts(values.maxAttempts) ?? 1;
};

export interface ExamEditContext {
  exam: Pick<
    LecturerExam,
    'startTime' | 'endTime' | 'durationMinutes' | 'status' | 'isContentLocked'
  > & {
    maxAttempts?: number | null;
    showResults?: boolean;
    shuffleQuestions?: boolean;
    shuffleOptions?: boolean;
  };
  /** True when the exam already has a question file and the lecturer has not removed it. */
  hasKeptFile: boolean;
}

const toMinuteFloor = (ms: number): number =>
  Math.floor(ms / MS_PER_MINUTE) * MS_PER_MINUTE;

/** Validates the schedule of an exam whose content is already locked (`OPEN` or `startedCount > 0`). */
const validateLockedSchedule = (
  values: ExamFormValues,
  exam: ExamEditContext['exam'],
  errors: ExamFormErrors,
): void => {
  if (exam.status === 'CLOSED') return;
  const start = toMinuteFloor(new Date(exam.startTime).getTime());
  const currentEnd = toMinuteFloor(new Date(exam.endTime).getTime());
  const end = new Date(values.endTime).getTime();
  if (Number.isNaN(end)) {
    errors.endTime = 'Choose when the exam closes';
  } else if (end < currentEnd) {
    errors.endTime =
      'The closing time can only be moved later once the exam has opened';
  } else if (end <= start) {
    errors.endTime = 'The closing time must be after the opening time';
  }

  const duration = parseDuration(values.durationMinutes);
  if (duration === null) {
    errors.durationMinutes = `Enter a whole number of minutes from ${MIN_DURATION_MINUTES} to ${MAX_DURATION_MINUTES}`;
  } else if (duration < exam.durationMinutes) {
    errors.durationMinutes =
      'The duration can only be made longer once the exam has opened';
  } else if (!errors.endTime && end > start) {
    const windowMinutes = Math.floor((end - start) / MS_PER_MINUTE);
    if (duration > windowMinutes) {
      errors.durationMinutes = `The duration cannot be longer than the time between opening and closing (${windowMinutes} minutes)`;
    }
  }

  if (values.unlimitedAttempts !== undefined || values.maxAttempts !== undefined) {
    const currentMax = exam.maxAttempts === undefined ? 1 : exam.maxAttempts;
    if (!values.unlimitedAttempts) {
      const parsed = parseMaxAttempts(values.maxAttempts ?? '');
      if (parsed === null) {
        errors.maxAttempts = `Enter a whole number of attempts from ${MIN_ATTEMPTS} to ${MAX_ATTEMPTS}`;
      } else if (currentMax === null || parsed < currentMax) {
        errors.maxAttempts =
          'Allowed attempts can only be increased once the exam has opened';
      }
    }
  }
};

/** UC-31 exception flow: missing questions or answers, an impossible schedule or a bad file are reported before saving. */
export const validateExamForm = (
  values: ExamFormValues,
  now: Date = new Date(),
  edit?: ExamEditContext,
): ExamFormErrors => {
  const errors: ExamFormErrors = { questionErrors: {} };
  const name = values.examName.trim();
  if (name === '') errors.examName = 'Enter the exam name';
  else if (name.length > EXAM_NAME_MAX_LENGTH)
    errors.examName = `The name can have at most ${EXAM_NAME_MAX_LENGTH} characters`;

  if (edit?.exam.isContentLocked) {
    validateLockedSchedule(values, edit.exam, errors);
    return errors;
  }

  const start = new Date(values.startTime).getTime();
  const end = new Date(values.endTime).getTime();
  if (Number.isNaN(start)) errors.startTime = 'Choose when the exam opens';
  if (Number.isNaN(end)) errors.endTime = 'Choose when the exam closes';
  const hasValidWindow = !errors.startTime && !errors.endTime;
  if (hasValidWindow && end <= start)
    errors.endTime = 'The closing time must be after the opening time';
  else if (hasValidWindow && end <= now.getTime())
    errors.endTime = 'The closing time must be in the future';

  const duration = parseDuration(values.durationMinutes);
  if (duration === null)
    errors.durationMinutes = `Enter a whole number of minutes from ${MIN_DURATION_MINUTES} to ${MAX_DURATION_MINUTES}`;
  else if (hasValidWindow && end > start) {
    const windowMinutes = Math.floor((end - start) / MS_PER_MINUTE);
    if (duration > windowMinutes)
      errors.durationMinutes = `The duration cannot be longer than the time between opening and closing (${windowMinutes} minutes)`;
  }

  if (!values.unlimitedAttempts && values.maxAttempts !== undefined) {
    if (parseMaxAttempts(values.maxAttempts) === null) {
      errors.maxAttempts = `Enter a whole number of attempts from ${MIN_ATTEMPTS} to ${MAX_ATTEMPTS}`;
    }
  }

  if (values.format === 'FILE') {
    if (values.file === null && !edit?.hasKeptFile) {
      errors.file = 'Choose the question file';
    } else if (values.file !== null) {
      const fileError = validateExamFile(values.file);
      if (fileError) errors.file = fileError;
    }
    return errors;
  }

  if (values.questions.length === 0) errors.questions = 'Add at least one question';
  else if (values.questions.length > EXAM_MAX_QUESTIONS)
    errors.questions = `An exam can have at most ${EXAM_MAX_QUESTIONS} questions`;
  values.questions.forEach((question, index) => {
    const questionErrors = validateQuestion(question);
    if (Object.keys(questionErrors).length > 0)
      errors.questionErrors[index] = questionErrors;
  });
  return errors;
};

const toNewQuestion = (question: ExamQuestionDraft): NewExamQuestion => {
  const type = resolveQuestionType(question);
  if (type === 'FILL_IN_THE_BLANK') {
    return {
      type: 'FILL_IN_THE_BLANK',
      correctCount: question.options.length,
      content: question.content.trim(),
      options: question.options.map((option) => ({
        content: option.trim(),
        isCorrect: true,
      })),
    };
  }
  const selected = new Set(resolveCorrectIndices(question));
  const correctCount = resolveCorrectCount(question);
  const mappedOptions = question.options.map((option, index) => ({
    content: option.trim(),
    isCorrect: selected.has(index),
  }));
  if (
    question.type === undefined &&
    (question.correctCount === undefined || question.correctCount === 1) &&
    selected.size <= 1
  ) {
    return {
      content: question.content.trim(),
      options: mappedOptions,
    };
  }
  return {
    type: 'MULTIPLE_CHOICE',
    correctCount,
    content: question.content.trim(),
    options: mappedOptions,
  };
};

/** Turns a form that passed `validateExamForm` into what the service sends; only the chosen format's part is kept. */
export const toNewExamInput = (
  values: ExamFormValues,
  edit?: ExamEditContext,
): NewExamInput => {
  const maxAttempts = resolveMaxAttempts(values);
  const showResults = values.showResults ?? true;
  const isMcq = values.format === 'MULTIPLE_CHOICE';
  if (edit?.exam.isContentLocked) {
    const typedEnd = new Date(values.endTime).getTime();
    const currentEnd = toMinuteFloor(new Date(edit.exam.endTime).getTime());
    const endTime =
      edit.exam.status === 'CLOSED' || typedEnd === currentEnd
        ? edit.exam.endTime
        : new Date(values.endTime).toISOString();
    const durationMinutes =
      edit.exam.status === 'CLOSED'
        ? edit.exam.durationMinutes
        : Number(values.durationMinutes.trim());
    return {
      examName: values.examName.trim(),
      startTime: edit.exam.startTime,
      endTime,
      durationMinutes,
      format: values.format,
      maxAttempts:
        edit.exam.status === 'CLOSED'
          ? (edit.exam.maxAttempts ?? 1)
          : maxAttempts,
      showResults,
      questions: [],
      file: null,
    };
  }
  return {
    examName: values.examName.trim(),
    startTime: new Date(values.startTime).toISOString(),
    endTime: new Date(values.endTime).toISOString(),
    durationMinutes: Number(values.durationMinutes.trim()),
    format: values.format,
    maxAttempts,
    showResults,
    shuffleQuestions: isMcq ? (values.shuffleQuestions ?? false) : false,
    shuffleOptions: isMcq ? (values.shuffleOptions ?? false) : false,
    questions:
      values.format === 'MULTIPLE_CHOICE'
        ? values.questions.map(toNewQuestion)
        : [],
    file: values.format === 'FILE' ? values.file : null,
  };
};
