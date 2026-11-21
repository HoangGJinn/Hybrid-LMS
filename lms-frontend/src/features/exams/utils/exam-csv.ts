import {
  escapeCsvCell,
  MAX_CSV_BYTES,
  normalizeCsvHeader,
  parseCsv,
  validateCsvFile,
} from '@shared/utils/csv';
import { downloadCsv } from '@shared/utils/download';
import type {
  ExamQuestion,
  ExamQuestionType,
  LecturerExamResults,
} from '../types/exams.types';
import {
  EXAM_MAX_QUESTIONS,
  MAX_OPTIONS,
  MIN_OPTIONS,
  OPTION_MAX_LENGTH,
  QUESTION_MAX_LENGTH,
  resolveCorrectIndices,
  resolveQuestionType,
  splitBlankVariants,
  validateClozePlaceholders,
  type ExamQuestionDraft,
} from './exam-form';

export {
  MAX_CSV_BYTES as MAX_QUESTION_CSV_BYTES,
  validateCsvFile as validateQuestionFile,
};

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'] as const;

/** Columns of the 9-column question file, in the order the template shows them. */
export const QUESTION_CSV_HEADER = [
  'Type',
  'Question',
  ...OPTION_LETTERS.map((letter) => `Option ${letter}`),
  'Correct',
];

/** Legacy 8-column header (without `Type`), still accepted on import for backward compatibility. */
const LEGACY_QUESTION_CSV_HEADER = [
  'Question',
  ...OPTION_LETTERS.map((letter) => `Option ${letter}`),
  'Correct',
];

/** The downloadable template: header + 3 example rows (single-choice MCQ, multi-answer MCQ, cloze FIB). */
export const QUESTION_TEMPLATE_CSV = `${[
  QUESTION_CSV_HEADER,
  ['MCQ', 'What is 2 + 2?', '3', '4', '5', '6', '', '', 'B'],
  ['MCQ', 'Which of the following are prime numbers?', '2', '4', '5', '9', '', '', 'A,C'],
  [
    'FIB',
    'The capital of {{1}} is {{2}}.',
    'Vietnam | Viet Nam',
    'Hanoi | Ha Noi',
    '',
    '',
    '',
    '',
    '',
  ],
]
  .map((row) => row.map(escapeCsvCell).join(','))
  .join('\r\n')}\r\n`;

export interface ParsedQuestionFile {
  /** Ready for the editor; empty whenever `errors` is not. */
  questions: ExamQuestionDraft[];
  /** Why the file cannot be imported, one entry per problem; empty when `questions` is usable. */
  errors: string[];
}

const normalizeAnswer = (text: string): string => text.trim().toLowerCase();

/** A question the lecturer has not touched, such as the empty one the dialog starts with. */
export const isBlankQuestion = (question: ExamQuestionDraft): boolean =>
  resolveQuestionType(question) === 'MULTIPLE_CHOICE' &&
  question.content.trim() === '' &&
  resolveCorrectIndices(question).length === 0 &&
  question.options.every((option) => option.trim() === '');

const failure = (...errors: string[]): ParsedQuestionFile => ({
  questions: [],
  errors,
});

/** Index of the last answer with text, or -1 when every answer is empty. */
const lastFilledIndex = (answers: string[]): number => {
  for (let index = answers.length - 1; index >= 0; index -= 1) {
    if (answers[index] !== '') return index;
  }
  return -1;
};

interface LocatedColumns {
  readonly typeColumn: number;
  readonly questionColumn: number;
  readonly answerColumns: readonly number[];
  readonly correctColumn: number;
}

/** Where each column sits in the header row, or the names of the required columns that are missing. */
const locateColumns = (
  header: string[],
): LocatedColumns | { missing: string[] } => {
  const normalized = header.map(normalizeCsvHeader);
  const typeColumn = normalized.indexOf('type');
  const required = LEGACY_QUESTION_CSV_HEADER.map((name) =>
    normalized.indexOf(normalizeCsvHeader(name)),
  );
  const missing = LEGACY_QUESTION_CSV_HEADER.filter(
    (_, i) => required[i] === -1,
  );
  if (missing.length > 0) return { missing };
  return {
    typeColumn,
    questionColumn: required[0],
    answerColumns: required.slice(1, -1),
    correctColumn: required[required.length - 1],
  };
};

const parseRowType = (rawType: string): ExamQuestionType | null => {
  const upper = rawType.trim().toUpperCase();
  if (upper === '' || upper === 'MCQ' || upper === 'MULTIPLE_CHOICE') {
    return 'MULTIPLE_CHOICE';
  }
  if (upper === 'FIB' || upper === 'FILL_IN_THE_BLANK' || upper === 'CLOZE') {
    return 'FILL_IN_THE_BLANK';
  }
  return null;
};

const parseCorrectLetters = (
  correct: string,
  answers: string[],
  at: (message: string) => string,
): { indices: number[]; errors: string[] } => {
  const errors: string[] = [];
  const hasSeparator = /[,|;]/.test(correct);
  if (!hasSeparator) {
    const letter = correct.toUpperCase();
    const idx = OPTION_LETTERS.findIndex((l) => l === letter);
    if (idx === -1) {
      errors.push(
        at(`Correct must be a letter from A to ${OPTION_LETTERS[MAX_OPTIONS - 1]}`),
      );
      return { indices: [], errors };
    }
    if (answers[idx] === '') {
      errors.push(at(`Correct points at answer ${letter}, which is empty`));
      return { indices: [], errors };
    }
    return { indices: [idx], errors };
  }

  const tokens = correct.split(/[,|;]/).map((token) => token.trim().toUpperCase());
  const seen = new Set<number>();
  const indices: number[] = [];
  for (const token of tokens) {
    const idx = OPTION_LETTERS.findIndex((l) => l === token);
    if (idx === -1) {
      errors.push(
        at(
          `Correct must be letters from A to ${OPTION_LETTERS[MAX_OPTIONS - 1]} separated by commas (e.g. A,C)`,
        ),
      );
      return { indices: [], errors };
    }
    if (seen.has(idx)) {
      errors.push(at(`Correct lists answer ${token} more than once`));
      continue;
    }
    seen.add(idx);
    if (answers[idx] === '') {
      errors.push(at(`Correct points at answer ${token}, which is empty`));
      continue;
    }
    indices.push(idx);
  }
  indices.sort((a, b) => a - b);
  return { indices, errors };
};

/** Problems of one MCQ row, each phrased with its row number (the header is row 1). */
const checkMcqRow = (
  row: number,
  question: string,
  answers: string[],
  correct: string,
): { errors: string[]; correctIndices: number[] } => {
  const errors: string[] = [];
  const at = (message: string) => `Row ${row}: ${message}`;

  if (question === '') errors.push(at('the question is empty'));
  else if (question.length > QUESTION_MAX_LENGTH)
    errors.push(
      at(`the question can have at most ${QUESTION_MAX_LENGTH} characters`),
    );

  const lastFilled = lastFilledIndex(answers);
  if (lastFilled + 1 < MIN_OPTIONS) {
    errors.push(at(`needs at least ${MIN_OPTIONS} answers`));
  } else {
    answers.slice(0, lastFilled).forEach((answer, index) => {
      if (answer === '')
        errors.push(
          at(
            `answer ${OPTION_LETTERS[index]} is empty; fill the answers in order, starting with A`,
          ),
        );
    });
  }

  const seen = new Map<string, string>();
  answers.forEach((answer, index) => {
    if (answer === '') return;
    const letter = OPTION_LETTERS[index];
    if (answer.length > OPTION_MAX_LENGTH)
      errors.push(
        at(`answer ${letter} can have at most ${OPTION_MAX_LENGTH} characters`),
      );
    const repeated = seen.get(normalizeAnswer(answer));
    if (repeated) errors.push(at(`answer ${letter} repeats answer ${repeated}`));
    else seen.set(normalizeAnswer(answer), letter);
  });

  const parsedCorrect = parseCorrectLetters(correct, answers, at);
  errors.push(...parsedCorrect.errors);
  return { errors, correctIndices: parsedCorrect.indices };
};

/** Problems of one Cloze Fill-in-the-Blank row. */
const checkFibRow = (
  row: number,
  question: string,
  answers: string[],
): string[] => {
  const errors: string[] = [];
  const at = (message: string) => `Row ${row}: ${message}`;

  if (question === '') errors.push(at('the question is empty'));
  else if (question.length > QUESTION_MAX_LENGTH)
    errors.push(
      at(`the question can have at most ${QUESTION_MAX_LENGTH} characters`),
    );

  const placeholderCheck =
    question !== '' && question.length <= QUESTION_MAX_LENGTH
      ? validateClozePlaceholders(question)
      : null;
  if (placeholderCheck && !placeholderCheck.valid) {
    errors.push(at(placeholderCheck.reason));
  }

  const lastFilled = lastFilledIndex(answers);
  if (lastFilled === -1) {
    errors.push(at('needs at least 1 blank answer in Option A'));
    return errors;
  }

  answers.slice(0, lastFilled).forEach((answer, index) => {
    if (answer === '') {
      errors.push(
        at(
          `blank answer ${OPTION_LETTERS[index]} is empty; fill blank answers in order, starting with A`,
        ),
      );
    }
  });

  answers.slice(0, lastFilled + 1).forEach((answer, index) => {
    if (answer === '') return;
    const letter = OPTION_LETTERS[index];
    if (answer.length > OPTION_MAX_LENGTH) {
      errors.push(
        at(
          `blank answer ${letter} can have at most ${OPTION_MAX_LENGTH} characters`,
        ),
      );
    } else if (splitBlankVariants(answer).length === 0) {
      errors.push(
        at(`blank answer ${letter} needs at least one valid answer`),
      );
    }
  });

  if (
    placeholderCheck?.valid &&
    lastFilled + 1 !== placeholderCheck.count
  ) {
    errors.push(
      at(
        `has ${placeholderCheck.count} blank(s) in the question text but ${lastFilled + 1} blank answer column(s) filled`,
      ),
    );
  }
  return errors;
};

/**
 * Reads a question file: supports both the 9-column format (with `Type`: `MCQ` / `FIB`) and legacy 8-column
 * MCQ files. Either the whole file is accepted or nothing is, so every problem is listed at once.
 */
export const parseQuestionCsv = (
  text: string,
  existingCount: number,
): ParsedQuestionFile => {
  const records = parseCsv(text);
  if (records.length === 0) return failure('The file is empty.');

  const located = locateColumns(records[0]);
  if ('missing' in located) {
    return failure(
      `The first row must be the header ${QUESTION_CSV_HEADER.join(', ')}. Missing: ${located.missing.join(', ')}.`,
    );
  }

  const errors: string[] = [];
  const questions: ExamQuestionDraft[] = [];
  records.slice(1).forEach((record, index) => {
    if (record.every((cell) => cell.trim() === '')) return;
    const rowNum = index + 2;
    const cell = (column: number) => (column >= 0 ? (record[column] ?? '').trim() : '');
    const rawType = cell(located.typeColumn);
    const rowType = parseRowType(rawType);
    if (!rowType) {
      errors.push(`Row ${rowNum}: Type must be MCQ or FIB`);
      return;
    }

    const question = cell(located.questionColumn);
    const answers = located.answerColumns.map(cell);
    const correct = cell(located.correctColumn);

    if (rowType === 'FILL_IN_THE_BLANK') {
      const rowErrors = checkFibRow(rowNum, question, answers);
      errors.push(...rowErrors);
      if (rowErrors.length > 0) return;

      const lastFilled = lastFilledIndex(answers);
      const blankCount = lastFilled + 1;
      questions.push({
        key: crypto.randomUUID(),
        type: 'FILL_IN_THE_BLANK',
        content: question,
        options: answers.slice(0, blankCount),
        correctIndex: 0,
        correctIndices: Array.from({ length: blankCount }, (_, i) => i),
        correctCount: blankCount,
      });
      return;
    }

    const mcqResult = checkMcqRow(rowNum, question, answers, correct);
    errors.push(...mcqResult.errors);
    if (mcqResult.errors.length > 0) return;

    const lastFilled = lastFilledIndex(answers);
    const { correctIndices } = mcqResult;
    if (correctIndices.length === 1) {
      questions.push({
        key: crypto.randomUUID(),
        content: question,
        options: answers.slice(0, lastFilled + 1),
        correctIndex: correctIndices[0],
      });
    } else {
      questions.push({
        key: crypto.randomUUID(),
        type: 'MULTIPLE_CHOICE',
        content: question,
        options: answers.slice(0, lastFilled + 1),
        correctIndex: correctIndices[0],
        correctIndices,
        correctCount: correctIndices.length,
      });
    }
  });

  if (errors.length > 0) return failure(...errors);
  if (questions.length === 0) return failure('The file has no questions.');
  const total = existingCount + questions.length;
  if (total > EXAM_MAX_QUESTIONS) {
    return failure(
      `An exam can have at most ${EXAM_MAX_QUESTIONS} questions; this file would bring it to ${total}.`,
    );
  }
  return { questions, errors: [] };
};

const isDraftQuestion = (
  question: ExamQuestionDraft | ExamQuestion,
): question is ExamQuestionDraft => 'correctIndex' in question;

/**
 * Exports all non-blank questions (both editor drafts and saved `LecturerExam` questions)
 * in the 9-column CSV format so they can be archived, edited, or re-imported.
 */
export const buildExamQuestionsCsv = (
  questions: readonly (ExamQuestionDraft | ExamQuestion)[],
): string => {
  const rows: string[][] = [[...QUESTION_CSV_HEADER]];
  for (const question of questions) {
    if (isDraftQuestion(question) && isBlankQuestion(question)) continue;
    const type: ExamQuestionType = isDraftQuestion(question)
      ? resolveQuestionType(question)
      : (question.type ?? 'MULTIPLE_CHOICE');
    const optionStrings = isDraftQuestion(question)
      ? question.options
      : question.options.map((option) => option.content);
    const correctIndices = isDraftQuestion(question)
      ? resolveCorrectIndices(question)
      : question.options.reduce<number[]>((acc, option, idx) => {
          if (option.isCorrect) acc.push(idx);
          return acc;
        }, []);

    const optionCells = Array.from(
      { length: MAX_OPTIONS },
      (_, idx) => optionStrings[idx] ?? '',
    );
    const typeCell = type === 'FILL_IN_THE_BLANK' ? 'FIB' : 'MCQ';
    const correctCell =
      type === 'FILL_IN_THE_BLANK'
        ? ''
        : correctIndices
            .map((idx) => OPTION_LETTERS[idx])
            .filter(Boolean)
            .join(',');

    rows.push([typeCell, question.content, ...optionCells, correctCell]);
  }
  return `${rows.map((row) => row.map(escapeCsvCell).join(',')).join('\r\n')}\r\n`;
};

/** Helper to trigger browser download of an exam's questions as CSV. */
export const exportQuestionsCsv = (
  questions: readonly (ExamQuestionDraft | ExamQuestion)[],
  fileName = 'exam-questions.csv',
): void => {
  downloadCsv(buildExamQuestionsCsv(questions), fileName);
};

export const EXAM_SUMMARY_CSV_HEADER = [
  'Student Code',
  'Full Name',
  'Email',
  'Status',
  'Attempts Used',
  'Best Score',
  'Latest Submitted At',
  'Feedback Comment',
] as const;

export const EXAM_DETAILED_ATTEMPTS_CSV_HEADER = [
  'Student Code',
  'Full Name',
  'Email',
  'Attempt #',
  'Status',
  'Started At',
  'Submitted At',
  'Correct Count',
  'Total Questions',
  'Score',
  'Feedback Comment',
] as const;

/**
 * Builds a Summary CSV (1 row per enrolled student in the class) for `SCRUM-54 Export Exam Results`.
 */
export const buildExamSummaryResultsCsv = (
  results: LecturerExamResults,
): string => {
  const rows: string[][] = [
    [...EXAM_SUMMARY_CSV_HEADER],
    ...results.students.map((stu) => [
      stu.studentCode,
      stu.fullName,
      stu.email,
      stu.status,
      String(stu.attemptsUsed),
      stu.bestScore !== null ? stu.bestScore.toFixed(2) : '',
      stu.latestSubmittedAt ?? '',
      stu.comment ?? '',
    ]),
  ];
  return `${rows.map((row) => row.map(escapeCsvCell).join(',')).join('\r\n')}\r\n`;
};

/**
 * Builds a Detailed Attempts CSV (1 row per attempt, or 1 NOT_STARTED row for students with 0 attempts).
 */
export const buildExamDetailedAttemptsCsv = (
  results: LecturerExamResults,
): string => {
  const rows: string[][] = [[...EXAM_DETAILED_ATTEMPTS_CSV_HEADER]];
  for (const stu of results.students) {
    if (stu.attempts.length === 0) {
      rows.push([
        stu.studentCode,
        stu.fullName,
        stu.email,
        '0',
        'NOT_STARTED',
        '',
        '',
        '',
        '',
        '',
        '',
      ]);
      continue;
    }
    for (const attempt of stu.attempts) {
      rows.push([
        stu.studentCode,
        stu.fullName,
        stu.email,
        String(attempt.attemptNumber),
        attempt.status,
        attempt.startedAt,
        attempt.submittedAt ?? attempt.endedAt ?? '',
        attempt.correctCount !== null ? String(attempt.correctCount) : '',
        attempt.totalQuestions > 0 ? String(attempt.totalQuestions) : '',
        attempt.score !== null ? attempt.score.toFixed(2) : '',
        attempt.comment ?? '',
      ]);
    }
  }
  return `${rows.map((row) => row.map(escapeCsvCell).join(',')).join('\r\n')}\r\n`;
};
