import { describe, expect, it } from 'vitest';
import { gradeMultipleChoiceAttempt } from './exam-grading.util.js';

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
});

