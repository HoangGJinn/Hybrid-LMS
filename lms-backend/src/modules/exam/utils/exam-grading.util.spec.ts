import { describe, expect, it } from 'vitest';
import { ExamQuestionType } from '../enums/exam-question-type.enum.js';
import {
  gradeMultipleChoiceAttempt,
  normalizeBlankAnswer,
  splitBlankVariants,
  validateClozePlaceholders,
  type SavedSessionAnswer,
} from './exam-grading.util.js';

describe('exam-grading.util', () => {
  const questions = [
    { id: 'q-1', correctOptionId: 'o-1b' },
    { id: 'q-2', correctOptionId: 'o-2a' },
    { id: 'q-3', correctOptionId: 'o-3c' },
  ];

  it('scores 10 when every question is answered with its correct option', () => {
    const answers = new Map([
      ['q-1', 'o-1b'],
      ['q-2', 'o-2a'],
      ['q-3', 'o-3c'],
    ]);
    expect(gradeMultipleChoiceAttempt(questions, answers)).toEqual({
      correctCount: 3,
      totalQuestions: 3,
      score: 10,
    });
  });

  it('rounds to 2 decimal places and treats unanswered questions as wrong', () => {
    const answers = new Map([
      ['q-1', 'o-1b'],
      ['q-2', 'o-2wrong'],
    ]);
    expect(gradeMultipleChoiceAttempt(questions, answers)).toEqual({
      correctCount: 1,
      totalQuestions: 3,
      score: 3.33,
    });
  });

  it('returns 0 when there are no questions', () => {
    expect(gradeMultipleChoiceAttempt([], new Map())).toEqual({
      correctCount: 0,
      totalQuestions: 0,
      score: 0,
    });
  });

  describe('multi-select MCQ (all-or-nothing)', () => {
    const multiQuestions = [
      {
        id: 'q-multi',
        type: ExamQuestionType.MULTIPLE_CHOICE,
        correctOptionIds: ['o-a', 'o-c'],
      },
    ];

    it('awards points only when all correct options are selected and no wrong options', () => {
      const exactMatch = new Map<string, SavedSessionAnswer>([
        [
          'q-multi',
          {
            selectedOptionId: 'o-a',
            selectedOptionIds: ['o-c', 'o-a'],
            textAnswers: [],
          },
        ],
      ]);
      expect(gradeMultipleChoiceAttempt(multiQuestions, exactMatch)).toEqual({
        correctCount: 1,
        totalQuestions: 1,
        score: 10,
      });
    });

    it('awards 0 when a correct option is missing or an extra wrong option is selected', () => {
      const partial = new Map<string, SavedSessionAnswer>([
        [
          'q-multi',
          {
            selectedOptionId: 'o-a',
            selectedOptionIds: ['o-a'],
            textAnswers: [],
          },
        ],
      ]);
      expect(gradeMultipleChoiceAttempt(multiQuestions, partial)).toEqual({
        correctCount: 0,
        totalQuestions: 1,
        score: 0,
      });

      const withWrong = new Map<string, SavedSessionAnswer>([
        [
          'q-multi',
          {
            selectedOptionId: 'o-a',
            selectedOptionIds: ['o-a', 'o-b'],
            textAnswers: [],
          },
        ],
      ]);
      expect(gradeMultipleChoiceAttempt(multiQuestions, withWrong)).toEqual({
        correctCount: 0,
        totalQuestions: 1,
        score: 0,
      });
    });
  });

  describe('cloze fill-in-the-blank grading and placeholder helpers', () => {
    it('normalizes whitespace/case and splits variants by pipe', () => {
      expect(normalizeBlankAnswer('  Hà   Nội  ')).toBe('hà nội');
      expect(splitBlankVariants('Hà Nội | Ha Noi |  | Hanoi ')).toEqual([
        'Hà Nội',
        'Ha Noi',
        'Hanoi',
      ]);
    });

    it('validates sequential unique placeholders {{1}}..{{k}}', () => {
      expect(validateClozePlaceholders('Thủ đô của {{1}} là {{2}}.')).toEqual({
        valid: true,
        count: 2,
      });
      expect(validateClozePlaceholders('No blanks here')).toEqual({
        valid: false,
        reason: expect.stringContaining('{{1}}'),
      });
      expect(validateClozePlaceholders('Dup {{1}} and {{1}}')).toEqual({
        valid: false,
        reason: expect.stringContaining('Duplicate'),
      });
      expect(validateClozePlaceholders('Skipped {{1}} and {{3}}')).toEqual({
        valid: false,
        reason: expect.stringContaining('sequentially'),
      });
      expect(
        validateClozePlaceholders('{{1}} {{2}} {{3}} {{4}} {{5}} {{6}} {{7}}'),
      ).toEqual({
        valid: false,
        reason: expect.stringContaining('At most 6 blanks'),
      });
    });

    it('grades mixed MCQ + FIB attempts case-insensitively with variants', () => {
      const mixed = [
        {
          id: 'q-mcq',
          type: ExamQuestionType.MULTIPLE_CHOICE,
          correctOptionIds: ['o-1', 'o-3'],
        },
        {
          id: 'q-fib',
          type: ExamQuestionType.FILL_IN_THE_BLANK,
          blankAnswers: ['Việt Nam | Viet Nam', 'Hà Nội | Ha Noi'],
        },
      ];

      const goodAnswers = new Map<string, SavedSessionAnswer>([
        [
          'q-mcq',
          {
            selectedOptionId: 'o-1',
            selectedOptionIds: ['o-1', 'o-3'],
            textAnswers: [],
          },
        ],
        [
          'q-fib',
          {
            selectedOptionId: null,
            selectedOptionIds: [],
            textAnswers: ['  viet   nam ', 'HÀ NỘI'],
          },
        ],
      ]);
      expect(gradeMultipleChoiceAttempt(mixed, goodAnswers)).toEqual({
        correctCount: 2,
        totalQuestions: 2,
        score: 10,
      });

      const oneBlankWrong = new Map<string, SavedSessionAnswer>([
        [
          'q-mcq',
          {
            selectedOptionId: 'o-1',
            selectedOptionIds: ['o-1', 'o-3'],
            textAnswers: [],
          },
        ],
        [
          'q-fib',
          {
            selectedOptionId: null,
            selectedOptionIds: [],
            textAnswers: ['Viet Nam', 'Saigon'],
          },
        ],
      ]);
      expect(gradeMultipleChoiceAttempt(mixed, oneBlankWrong)).toEqual({
        correctCount: 1,
        totalQuestions: 2,
        score: 5,
      });
    });
  });
});

