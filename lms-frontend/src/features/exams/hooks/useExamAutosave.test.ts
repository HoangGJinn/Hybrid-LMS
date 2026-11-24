import { describe, expect, it } from 'vitest';
import {
  buildSubmitPayload,
  getQuestionAnswerState,
  hasAnyDraftContent,
} from './useExamAutosave';
import type { StudentExamQuestion } from '../types/exams.types';

describe('useExamAutosave helpers', () => {
  const singleMcq: StudentExamQuestion = {
    id: 'q-single',
    type: 'MULTIPLE_CHOICE',
    correctCount: 1,
    content: '1+1?',
    orderIndex: 0,
    options: [
      { id: 'o-1', content: '2' },
      { id: 'o-2', content: '3' },
    ],
  };

  const multiMcq: StudentExamQuestion = {
    id: 'q-multi',
    type: 'MULTIPLE_CHOICE',
    correctCount: 2,
    content: 'Primes?',
    orderIndex: 1,
    options: [
      { id: 'm-1', content: '2' },
      { id: 'm-2', content: '4' },
      { id: 'm-3', content: '5' },
    ],
  };

  const fibQuestion: StudentExamQuestion = {
    id: 'q-fib',
    type: 'FILL_IN_THE_BLANK',
    correctCount: 2,
    content: 'Capital of {{1}} is {{2}}.',
    orderIndex: 2,
    options: [],
  };

  it('computes UNANSWERED, PARTIAL, and ANSWERED states accurately for all question types', () => {
    expect(getQuestionAnswerState(singleMcq, undefined)).toBe('UNANSWERED');
    expect(
      getQuestionAnswerState(singleMcq, { optionIds: ['o-1'], textAnswers: [] }),
    ).toBe('ANSWERED');

    expect(getQuestionAnswerState(multiMcq, undefined)).toBe('UNANSWERED');
    expect(
      getQuestionAnswerState(multiMcq, { optionIds: ['m-1'], textAnswers: [] }),
    ).toBe('PARTIAL');
    expect(
      getQuestionAnswerState(multiMcq, {
        optionIds: ['m-1', 'm-3'],
        textAnswers: [],
      }),
    ).toBe('ANSWERED');

    expect(getQuestionAnswerState(fibQuestion, undefined)).toBe('UNANSWERED');
    expect(
      getQuestionAnswerState(fibQuestion, {
        optionIds: [],
        textAnswers: ['Vietnam', '   '],
      }),
    ).toBe('PARTIAL');
    expect(
      getQuestionAnswerState(fibQuestion, {
        optionIds: [],
        textAnswers: ['Vietnam', 'Hanoi'],
      }),
    ).toBe('ANSWERED');
  });

  it('detects whether a draft contains any input', () => {
    expect(hasAnyDraftContent(undefined)).toBe(false);
    expect(hasAnyDraftContent({ optionIds: [], textAnswers: ['   '] })).toBe(
      false,
    );
    expect(hasAnyDraftContent({ optionIds: ['o-1'], textAnswers: [] })).toBe(
      true,
    );
    expect(hasAnyDraftContent({ optionIds: [], textAnswers: ['Hanoi'] })).toBe(
      true,
    );
  });

  it('builds submit payloads tailored to single-choice, multi-select, and FIB questions', () => {
    const payload = buildSubmitPayload([singleMcq, multiMcq, fibQuestion], {
      'q-single': { optionIds: ['o-1'], textAnswers: [] },
      'q-multi': { optionIds: ['m-1', 'm-3'], textAnswers: [] },
      'q-fib': { optionIds: [], textAnswers: ['Vietnam', 'Hanoi'] },
    });

    expect(payload).toEqual([
      { questionId: 'q-single', optionId: 'o-1', optionIds: ['o-1'] },
      { questionId: 'q-multi', optionIds: ['m-1', 'm-3'] },
      { questionId: 'q-fib', textAnswers: ['Vietnam', 'Hanoi'] },
    ]);
  });
});
