import {
  BLANK_VARIANT_SEPARATOR,
  EXAM_MAX_SCORE,
  MAX_BLANKS,
} from '../constants/exam-rules.constant.js';
import { ExamQuestionType } from '../enums/exam-question-type.enum.js';
import type { ExamReviewQuestionView } from '../types/student-exam-view.type.js';
import { shuffleWithSeed } from './exam-shuffle.util.js';

export interface GradableQuestion {
  readonly id: string;
  readonly type?: ExamQuestionType;
  readonly correctOptionId?: string | null;
  readonly correctOptionIds?: readonly string[];
  /** For FILL_IN_THE_BLANK: pipe-separated acceptable variants per blank index 0..k-1. */
  readonly blankAnswers?: readonly string[];
}

export interface SavedSessionAnswer {
  readonly selectedOptionId: string | null;
  readonly selectedOptionIds: readonly string[];
  readonly textAnswers: readonly string[];
}

export type RawSavedAnswer = string | SavedSessionAnswer | undefined;

export interface GradeSummary {
  readonly correctCount: number;
  readonly totalQuestions: number;
  readonly score: number;
}

export type ClozeValidationResult =
  | { readonly valid: true; readonly count: number }
  | { readonly valid: false; readonly reason: string };

const CLOZE_PLACEHOLDER_REGEX = /\{\{(\d+)\}\}/g;

/** Extracts placeholder numbers (`{{1}}`, `{{2}}`, ...) in appearance order. */
export const extractClozePlaceholders = (content: string): number[] => {
  const numbers: number[] = [];
  for (const match of content.matchAll(CLOZE_PLACEHOLDER_REGEX)) {
    numbers.push(Number(match[1]));
  }
  return numbers;
};

/**
 * Validates that a fill-in-the-blank stem contains sequential, unique placeholders `{{1}}..{{k}}`
 * where `1 <= k <= MAX_BLANKS`.
 */
export const validateClozePlaceholders = (
  content: string,
): ClozeValidationResult => {
  const numbers = extractClozePlaceholders(content);
  if (numbers.length === 0) {
    return {
      valid: false,
      reason:
        'Fill-in-the-blank questions must include at least one blank placeholder like {{1}} in the text',
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

export const extractSavedAnswerFields = (
  raw: RawSavedAnswer,
): SavedSessionAnswer => {
  if (raw === undefined) {
    return { selectedOptionId: null, selectedOptionIds: [], textAnswers: [] };
  }
  if (typeof raw === 'string') {
    return {
      selectedOptionId: raw,
      selectedOptionIds: [raw],
      textAnswers: [],
    };
  }
  let selectedOptionIds: readonly string[] = [];
  if (raw.selectedOptionIds.length > 0) {
    selectedOptionIds = raw.selectedOptionIds;
  } else if (raw.selectedOptionId) {
    selectedOptionIds = [raw.selectedOptionId];
  }
  return {
    selectedOptionId: raw.selectedOptionId ?? selectedOptionIds[0] ?? null,
    selectedOptionIds,
    textAnswers: raw.textAnswers,
  };
};

const normalizeSavedAnswer = (
  raw: RawSavedAnswer,
): {
  readonly selectedOptionIds: readonly string[];
  readonly textAnswers: readonly string[];
} => {
  const fields = extractSavedAnswerFields(raw);
  return {
    selectedOptionIds: fields.selectedOptionIds,
    textAnswers: fields.textAnswers,
  };
};

/** Maps exam questions and option rows into `GradableQuestion[]` and scores the session. */
export const computeExamContentGrade = (
  content: {
    readonly questions: readonly {
      readonly id: string;
      readonly type?: ExamQuestionType;
    }[];
    readonly optionsByQuestionId: ReadonlyMap<
      string,
      readonly {
        readonly id: string;
        readonly content: string;
        readonly isCorrect: boolean;
      }[]
    >;
  },
  answers: ReadonlyMap<string, string | SavedSessionAnswer>,
): GradeSummary => {
  const gradable: GradableQuestion[] = content.questions.map((question) => {
    const type = question.type ?? ExamQuestionType.MULTIPLE_CHOICE;
    const options = content.optionsByQuestionId.get(question.id) ?? [];
    if (type === ExamQuestionType.FILL_IN_THE_BLANK) {
      return {
        id: question.id,
        type,
        blankAnswers: options.map((option) => option.content),
      };
    }
    const correctOptionIds = options
      .filter((option) => option.isCorrect)
      .map((option) => option.id);
    return {
      id: question.id,
      type,
      correctOptionId: correctOptionIds[0] ?? null,
      correctOptionIds,
    };
  });
  return gradeMultipleChoiceAttempt(gradable, answers);
};

/** Builds ordered review questions (preserving blank order for FIB) for student and lecturer review views. */
export const buildExamReviewQuestions = (
  exam: {
    readonly shuffleQuestions: boolean;
    readonly shuffleOptions: boolean;
  },
  sessionId: string,
  content: {
    readonly questions: readonly {
      readonly id: string;
      readonly type?: ExamQuestionType;
      readonly correctCount?: number;
      readonly content: string;
    }[];
    readonly optionsByQuestionId: ReadonlyMap<
      string,
      readonly {
        readonly id: string;
        readonly content: string;
        readonly isCorrect: boolean;
      }[]
    >;
  },
  savedAnswers: ReadonlyMap<string, string | SavedSessionAnswer>,
): ExamReviewQuestionView[] => {
  const orderedQuestions = exam.shuffleQuestions
    ? shuffleWithSeed(content.questions, sessionId)
    : content.questions;
  return orderedQuestions.map((question) => {
    const type = question.type ?? ExamQuestionType.MULTIPLE_CHOICE;
    const rawOptions = content.optionsByQuestionId.get(question.id) ?? [];
    const orderedOptions =
      type === ExamQuestionType.MULTIPLE_CHOICE && exam.shuffleOptions
        ? shuffleWithSeed(rawOptions, `${sessionId}:${question.id}`)
        : rawOptions;
    const correctCount =
      question.correctCount ??
      (type === ExamQuestionType.FILL_IN_THE_BLANK
        ? rawOptions.length || 1
        : rawOptions.filter((option) => option.isCorrect).length || 1);
    const saved = extractSavedAnswerFields(savedAnswers.get(question.id));
    return {
      id: question.id,
      type,
      correctCount,
      content: question.content,
      selectedOptionId: saved.selectedOptionId,
      selectedOptionIds: saved.selectedOptionIds,
      textAnswers: saved.textAnswers,
      options: orderedOptions.map((option) => ({
        id: option.id,
        content: option.content,
        isCorrect: option.isCorrect,
      })),
    };
  });
};

const isFillInTheBlankCorrect = (
  blanks: readonly string[],
  textAnswers: readonly string[],
): boolean => {
  if (blanks.length === 0 || textAnswers.length < blanks.length) {
    return false;
  }
  return blanks.every((blank, i) => {
    const studentNorm = normalizeBlankAnswer(textAnswers[i] ?? '');
    if (studentNorm === '') return false;
    return splitBlankVariants(blank).map(normalizeBlankAnswer).includes(studentNorm);
  });
};

/** Checks whether a single question's answer is completely correct (all-or-nothing). */
export const isQuestionAnswerCorrect = (
  question: GradableQuestion,
  rawAnswer: RawSavedAnswer,
): boolean => {
  const answer = normalizeSavedAnswer(rawAnswer);
  if (question.type === ExamQuestionType.FILL_IN_THE_BLANK) {
    return isFillInTheBlankCorrect(
      question.blankAnswers ?? [],
      answer.textAnswers,
    );
  }

  const expectedIds =
    question.correctOptionIds ??
    (question.correctOptionId ? [question.correctOptionId] : []);
  if (expectedIds.length === 0) {
    return false;
  }
  const uniqueSelected = new Set(answer.selectedOptionIds);
  if (uniqueSelected.size !== expectedIds.length) {
    return false;
  }
  return expectedIds.every((id) => uniqueSelected.has(id));
};

/**
 * Grades an exam attempt on a 10-point scale, rounded to 2 decimal places.
 * Supports single-choice MCQ, multi-select MCQ (all-or-nothing), and cloze fill-in-the-blank.
 * Unanswered questions count as wrong.
 */
export const gradeMultipleChoiceAttempt = (
  questions: readonly GradableQuestion[],
  selectedByQuestionId: ReadonlyMap<string, string | SavedSessionAnswer>,
): GradeSummary => {
  const totalQuestions = questions.length;
  if (totalQuestions === 0) {
    return { correctCount: 0, totalQuestions: 0, score: 0 };
  }
  const correctCount = questions.filter((question) =>
    isQuestionAnswerCorrect(question, selectedByQuestionId.get(question.id)),
  ).length;
  const rawScore = (correctCount / totalQuestions) * EXAM_MAX_SCORE;
  const score = Math.round(rawScore * 100) / 100;
  return { correctCount, totalQuestions, score };
};
