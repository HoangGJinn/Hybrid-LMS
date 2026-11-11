import { describe, expect, it } from 'vitest';
import { createEmptyQuestion, type ExamQuestionDraft } from './exam-form';
import {
  isBlankQuestion,
  parseQuestionCsv,
  QUESTION_TEMPLATE_CSV,
  validateQuestionFile,
} from './exam-csv';

const HEADER = 'Question,Option A,Option B,Option C,Option D,Option E,Option F,Correct';

describe('QUESTION_TEMPLATE_CSV', () => {
  it('should be a file the importer accepts as it is', () => {
    const actual = parseQuestionCsv(QUESTION_TEMPLATE_CSV, 0);

    expect(actual.errors).toEqual([]);
    expect(actual.questions).toHaveLength(1);
    expect(actual.questions[0].options).toEqual(['3', '4', '5', '6']);
    expect(actual.questions[0].correctIndex).toBe(1);
  });
});

describe('parseQuestionCsv', () => {
  it('should read questions with 2 to 6 answers and their correct letter', () => {
    const text = [
      HEADER,
      'Q1,a,b,,,,,A',
      'Q2,a,b,c,d,e,f,F',
      '"Q3, with comma",a,b,c,,,,c',
    ].join('\n');

    const actual = parseQuestionCsv(text, 0);

    expect(actual.errors).toEqual([]);
    expect(actual.questions.map((q) => q.options.length)).toEqual([2, 6, 3]);
    expect(actual.questions.map((q) => q.correctIndex)).toEqual([0, 5, 2]);
    expect(actual.questions[2].content).toBe('Q3, with comma');
  });

  it('should read a file saved by Excel: BOM and semicolons', () => {
    const text = `\uFEFF${HEADER.replaceAll(',', ';')}\r\nQ1;a;b;;;;;B\r\n`;

    const actual = parseQuestionCsv(text, 0);

    expect(actual.errors).toEqual([]);
    expect(actual.questions[0].correctIndex).toBe(1);
  });

  it('should accept the columns in another order and ignore blank rows', () => {
    const text =
      'Correct,Option F,Option E,Option D,Option C,Option B,Option A,Question\nA,,,,,two,one,Q1\n,,,,,,,\n';

    const actual = parseQuestionCsv(text, 0);

    expect(actual.errors).toEqual([]);
    expect(actual.questions[0].options).toEqual(['one', 'two']);
  });

  it('should reject an empty file', () => {
    expect(parseQuestionCsv('', 0).errors).toEqual(['The file is empty.']);
  });

  it('should name the missing columns', () => {
    const actual = parseQuestionCsv('Question,Option A\nQ,a', 0);

    expect(actual.errors).toHaveLength(1);
    expect(actual.errors[0]).toMatch(/Missing: .*Option B.*Correct/);
  });

  it('should reject a file with a header only', () => {
    expect(parseQuestionCsv(HEADER, 0).errors).toEqual(['The file has no questions.']);
  });

  describe('row errors', () => {
    const errorsOf = (row: string) =>
      parseQuestionCsv(`${HEADER}\n${row}`, 0).errors;

    it('should report an empty question with its row number', () => {
      expect(errorsOf(',a,b,,,,,A')).toEqual(['Row 2: the question is empty']);
    });

    it('should report fewer than two answers', () => {
      expect(errorsOf('Q,a,,,,,,A')).toContain('Row 2: needs at least 2 answers');
    });

    it('should report a gap between answers', () => {
      expect(errorsOf('Q,a,b,,d,,,A')).toEqual([
        'Row 2: answer C is empty; fill the answers in order, starting with A',
      ]);
    });

    it.each(['', 'G', 'AB', '1'])('should report an invalid Correct value "%s"', (value) => {
      expect(errorsOf(`Q,a,b,,,,,${value}`)).toEqual([
        'Row 2: Correct must be a letter from A to F',
      ]);
    });

    it('should report a Correct that points at an empty answer', () => {
      expect(errorsOf('Q,a,b,,,,,D')).toEqual([
        'Row 2: Correct points at answer D, which is empty',
      ]);
    });

    it('should report repeated answers, ignoring case and spaces', () => {
      expect(errorsOf('Q,Paris, paris ,Rome,,,,A')).toEqual([
        'Row 2: answer B repeats answer A',
      ]);
    });

    it('should report a question or answer above its length limit', () => {
      const errors = errorsOf(`${'x'.repeat(2001)},a,${'y'.repeat(501)},,,,,A`);

      expect(errors).toEqual([
        'Row 2: the question can have at most 2000 characters',
        'Row 2: answer B can have at most 500 characters',
      ]);
    });

    it('should list every problem and import nothing when any row is wrong', () => {
      const text = [HEADER, 'Q1,a,b,,,,,A', ',a,b,,,,,A', 'Q3,a,,,,,,A'].join('\n');

      const actual = parseQuestionCsv(text, 0);

      expect(actual.questions).toEqual([]);
      expect(actual.errors.some((e) => e.startsWith('Row 3'))).toBe(true);
      expect(actual.errors.some((e) => e.startsWith('Row 4'))).toBe(true);
      expect(actual.errors.some((e) => e.startsWith('Row 2'))).toBe(false);
    });
  });

  describe('question limit', () => {
    const rows = (count: number) =>
      Array.from({ length: count }, (_, i) => `Q${i},a,b,,,,,A`).join('\n');

    it('should accept a file that brings the exam to exactly 100', () => {
      expect(parseQuestionCsv(`${HEADER}\n${rows(60)}`, 40).errors).toEqual([]);
    });

    it('should count the questions already in the exam', () => {
      const actual = parseQuestionCsv(`${HEADER}\n${rows(61)}`, 40);

      expect(actual.questions).toEqual([]);
      expect(actual.errors[0]).toMatch(/at most 100 questions.*101/);
    });
  });
});

describe('validateQuestionFile', () => {
  it('should accept a file of normal size', () => {
    expect(validateQuestionFile({ size: 1000 })).toBeNull();
  });

  it('should reject an empty file', () => {
    expect(validateQuestionFile({ size: 0 })).toMatch(/empty/);
  });

  it('should reject a file above 2 MB', () => {
    expect(validateQuestionFile({ size: 2 * 1024 * 1024 + 1 })).toMatch(/2 MB/);
  });
});

describe('isBlankQuestion', () => {
  it('should be true for the question a new dialog starts with', () => {
    expect(isBlankQuestion(createEmptyQuestion())).toBe(true);
  });

  it.each<Partial<ExamQuestionDraft>>([
    { content: 'x' },
    { options: ['', 'x', '', ''] },
    { correctIndex: 0 },
  ])('should be false once anything is entered: %o', (patch) => {
    expect(isBlankQuestion({ ...createEmptyQuestion(), ...patch })).toBe(false);
  });
});
