import {
  escapeCsvCell,
  MAX_CSV_BYTES,
  normalizeCsvHeader,
  parseCsv,
  validateCsvFile,
} from '@shared/utils/csv';
import type { LecturerExamResults } from '../types/exams.types';
import {
  EXAM_MAX_QUESTIONS,
  MAX_OPTIONS,
  MIN_OPTIONS,
  OPTION_MAX_LENGTH,
  QUESTION_MAX_LENGTH,
  type ExamQuestionDraft,
} from './exam-form';

export {
  MAX_CSV_BYTES as MAX_QUESTION_CSV_BYTES,
  validateCsvFile as validateQuestionFile,
};

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'] as const;

/** Columns of the question file, in the order the template shows them. */
export const QUESTION_CSV_HEADER = [
  'Question',
  ...OPTION_LETTERS.map((letter) => `Option ${letter}`),
  'Correct',
];

/** The downloadable template: the header and one filled-in example row. */
export const QUESTION_TEMPLATE_CSV = `${[
  QUESTION_CSV_HEADER,
  ['What is 2 + 2?', '3', '4', '5', '6', '', '', 'B'],
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
  question.content.trim() === '' &&
  question.correctIndex === null &&
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

/** Where each column sits in the header row, or the names of the columns that are missing. */
const locateColumns = (
  header: string[],
): { columns: number[] } | { missing: string[] } => {
  const normalized = header.map(normalizeCsvHeader);
  const columns = QUESTION_CSV_HEADER.map((name) =>
    normalized.indexOf(normalizeCsvHeader(name)),
  );
  const missing = QUESTION_CSV_HEADER.filter((_, i) => columns[i] === -1);
  return missing.length > 0 ? { missing } : { columns };
};

/** Problems of one row, each phrased with its row number (the header is row 1). */
const checkRow = (
  row: number,
  question: string,
  answers: string[],
  correct: string,
): string[] => {
  const errors: string[] = [];
  const at = (message: string) => `Row ${row}: ${message}`;

  if (question === '') errors.push(at('the question is empty'));
  else if (question.length > QUESTION_MAX_LENGTH)
    errors.push(at(`the question can have at most ${QUESTION_MAX_LENGTH} characters`));

  const lastFilled = lastFilledIndex(answers);
  if (lastFilled + 1 < MIN_OPTIONS) {
    errors.push(at(`needs at least ${MIN_OPTIONS} answers`));
  } else {
    answers.slice(0, lastFilled).forEach((answer, index) => {
      if (answer === '')
        errors.push(
          at(`answer ${OPTION_LETTERS[index]} is empty; fill the answers in order, starting with A`),
        );
    });
  }

  const seen = new Map<string, string>();
  answers.forEach((answer, index) => {
    if (answer === '') return;
    const letter = OPTION_LETTERS[index];
    if (answer.length > OPTION_MAX_LENGTH)
      errors.push(at(`answer ${letter} can have at most ${OPTION_MAX_LENGTH} characters`));
    const repeated = seen.get(normalizeAnswer(answer));
    if (repeated) errors.push(at(`answer ${letter} repeats answer ${repeated}`));
    else seen.set(normalizeAnswer(answer), letter);
  });

  const letter = correct.toUpperCase();
  const correctIndex = OPTION_LETTERS.findIndex((l) => l === letter);
  if (correctIndex === -1)
    errors.push(at(`Correct must be a letter from A to ${OPTION_LETTERS[MAX_OPTIONS - 1]}`));
  else if (answers[correctIndex] === '')
    errors.push(at(`Correct points at answer ${letter}, which is empty`));
  return errors;
};

/**
 * Reads a question file: a header row, then one question per row with up to six answers and the letter
 * of the correct one. Either the whole file is accepted or nothing is, so every problem is listed at once.
 * `existingCount` is the number of questions already in the editor, which the file is added to.
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
  const [questionColumn, correctColumn] = [
    located.columns[0],
    located.columns[located.columns.length - 1],
  ];
  const answerColumns = located.columns.slice(1, -1);

  const errors: string[] = [];
  const questions: ExamQuestionDraft[] = [];
  records.slice(1).forEach((record, index) => {
    if (record.every((cell) => cell.trim() === '')) return;
    const cell = (column: number) => (record[column] ?? '').trim();
    const question = cell(questionColumn);
    const answers = answerColumns.map(cell);
    const correct = cell(correctColumn);
    const rowErrors = checkRow(index + 2, question, answers, correct);
    errors.push(...rowErrors);
    if (rowErrors.length > 0) return;

    const lastFilled = lastFilledIndex(answers);
    questions.push({
      key: crypto.randomUUID(),
      content: question,
      options: answers.slice(0, lastFilled + 1),
      correctIndex: OPTION_LETTERS.findIndex((l) => l === correct.toUpperCase()),
    });
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

