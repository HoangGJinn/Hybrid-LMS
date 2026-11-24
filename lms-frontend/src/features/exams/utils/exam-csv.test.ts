import { describe, expect, it } from 'vitest';
import { createEmptyQuestion, type ExamQuestionDraft } from './exam-form';
import {
  buildExamDetailedAttemptsCsv,
  buildExamQuestionsCsv,
  buildExamSummaryResultsCsv,
  isBlankQuestion,
  parseQuestionCsv,
  QUESTION_CSV_HEADER,
  QUESTION_TEMPLATE_CSV,
  validateQuestionFile,
} from './exam-csv';
import type { ExamQuestion, LecturerExamResults } from '../types/exams.types';

const HEADER = 'Question,Option A,Option B,Option C,Option D,Option E,Option F,Correct';
const HEADER_9 = QUESTION_CSV_HEADER.join(',');

describe('QUESTION_TEMPLATE_CSV', () => {
  it('should be a file the importer accepts with MCQ single, MCQ multi-answer, and Cloze FIB examples', () => {
    const actual = parseQuestionCsv(QUESTION_TEMPLATE_CSV, 0);

    expect(actual.errors).toEqual([]);
    expect(actual.questions).toHaveLength(3);
    expect(actual.questions[0].options).toEqual(['3', '4', '5', '6']);
    expect(actual.questions[0].correctIndex).toBe(1);
    expect(actual.questions[1]).toMatchObject({
      type: 'MULTIPLE_CHOICE',
      correctIndices: [0, 2],
      correctCount: 2,
    });
    expect(actual.questions[2]).toMatchObject({
      type: 'FILL_IN_THE_BLANK',
      content: 'The capital of {{1}} is {{2}}.',
      options: ['Vietnam | Viet Nam', 'Hanoi | Ha Noi'],
      correctCount: 2,
    });
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

  describe('9-column format (multi-answer MCQ & Cloze FIB)', () => {
    it('parses multi-answer MCQ with comma or pipe separated letters and Cloze FIB rows', () => {
      const text = [
        HEADER_9,
        'MCQ,"Pick primes",2,4,5,9,,,"A,C"',
        'FIB,"{{1}} runs on {{2}}.","Node.js | NodeJS","V8",,,,,',
      ].join('\n');

      const actual = parseQuestionCsv(text, 0);

      expect(actual.errors).toEqual([]);
      expect(actual.questions).toHaveLength(2);
      expect(actual.questions[0]).toMatchObject({
        type: 'MULTIPLE_CHOICE',
        correctIndices: [0, 2],
        correctCount: 2,
      });
      expect(actual.questions[1]).toMatchObject({
        type: 'FILL_IN_THE_BLANK',
        content: '{{1}} runs on {{2}}.',
        options: ['Node.js | NodeJS', 'V8'],
        correctCount: 2,
      });
    });

    it('reports errors for invalid Type, duplicate Correct letters, and mismatched FIB blanks', () => {
      const text = [
        HEADER_9,
        'ESSAY,Q1,a,b,,,,,A',
        'MCQ,Q2,a,b,,,,,"A,A"',
        'FIB,"No blank here",ans,,,,,,',
        'FIB,"Has {{1}} and {{2}}",onlyOne,,,,,,',
      ].join('\n');

      const actual = parseQuestionCsv(text, 0);

      expect(actual.questions).toEqual([]);
      expect(actual.errors).toEqual([
        'Row 2: Type must be MCQ or FIB',
        'Row 3: Correct lists answer A more than once',
        'Row 4: Include at least one blank placeholder like {{1}} in the question text',
        'Row 5: has 2 blank(s) in the question text but 1 blank answer column(s) filled',
      ]);
    });
  });
});

describe('buildExamQuestionsCsv (round-trip export)', () => {
  it('exports drafts (skipping blank) and saved ExamQuestions into re-importable 9-column CSV', () => {
    const drafts: ExamQuestionDraft[] = [
      createEmptyQuestion(),
      {
        key: 'q-multi',
        type: 'MULTIPLE_CHOICE',
        content: 'Primes?',
        options: ['2', '4', '5'],
        correctIndex: 0,
        correctIndices: [0, 2],
        correctCount: 2,
      },
      {
        key: 'q-fib',
        type: 'FILL_IN_THE_BLANK',
        content: 'Capital of {{1}} is {{2}}.',
        options: ['Vietnam | Viet Nam', 'Hanoi'],
        correctIndex: 0,
        correctIndices: [0, 1],
        correctCount: 2,
      },
    ];

    const csv = buildExamQuestionsCsv(drafts);
    const reimported = parseQuestionCsv(csv, 0);

    expect(reimported.errors).toEqual([]);
    expect(reimported.questions).toHaveLength(2);
    expect(reimported.questions[0]).toMatchObject({
      type: 'MULTIPLE_CHOICE',
      content: 'Primes?',
      options: ['2', '4', '5'],
      correctIndices: [0, 2],
      correctCount: 2,
    });
    expect(reimported.questions[1]).toMatchObject({
      type: 'FILL_IN_THE_BLANK',
      content: 'Capital of {{1}} is {{2}}.',
      options: ['Vietnam | Viet Nam', 'Hanoi'],
      correctCount: 2,
    });

    const savedQuestions: ExamQuestion[] = [
      {
        id: 's-1',
        type: 'MULTIPLE_CHOICE',
        correctCount: 1,
        content: '1+1?',
        orderIndex: 0,
        options: [
          { id: 'o-1', content: '1', isCorrect: false },
          { id: 'o-2', content: '2', isCorrect: true },
        ],
      },
    ];
    const savedCsv = buildExamQuestionsCsv(savedQuestions);
    expect(parseQuestionCsv(savedCsv, 0).questions).toHaveLength(1);
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

describe('buildExamSummaryResultsCsv & buildExamDetailedAttemptsCsv', () => {
  const sampleResults: LecturerExamResults = {
    examId: 'exam-1',
    classId: 'class-1',
    examName: 'Midterm',
    format: 'MULTIPLE_CHOICE',
    maxAttempts: 2,
    summary: {
      totalStudents: 2,
      startedCount: 1,
      submittedCount: 1,
      gradedCount: 1,
      averageScore: 8.5,
      maxScore: 8.5,
      minScore: 8.5,
    },
    students: [
      {
        studentId: 'stu-1',
        studentCode: '22110001',
        fullName: 'Nguyen Van A',
        email: 'a@school.edu.vn',
        status: 'GRADED',
        attemptsUsed: 2,
        bestScore: 8.5,
        latestSessionId: 's-2',
        latestSubmittedAt: '2026-11-12T08:30:00Z',
        gradedAt: null,
        comment: 'Well done, good job',
        attempts: [
          {
            sessionId: 's-1',
            attemptNumber: 1,
            status: 'COMPLETED',
            startedAt: '2026-11-12T08:00:00Z',
            endedAt: '2026-11-12T08:15:00Z',
            submittedAt: '2026-11-12T08:15:00Z',
            gradedAt: null,
            score: 6,
            comment: null,
            correctCount: 6,
            totalQuestions: 10,
            submittedFiles: [],
          },
          {
            sessionId: 's-2',
            attemptNumber: 2,
            status: 'COMPLETED',
            startedAt: '2026-11-12T08:20:00Z',
            endedAt: '2026-11-12T08:30:00Z',
            submittedAt: '2026-11-12T08:30:00Z',
            gradedAt: null,
            score: 8.5,
            comment: 'Well done, good job',
            correctCount: 17,
            totalQuestions: 20,
            submittedFiles: [],
          },
        ],
      },
      {
        studentId: 'stu-2',
        studentCode: '22110002',
        fullName: 'Tran Thi B',
        email: 'b@school.edu.vn',
        status: 'NOT_STARTED',
        attemptsUsed: 0,
        bestScore: null,
        latestSessionId: null,
        latestSubmittedAt: null,
        gradedAt: null,
        comment: null,
        attempts: [],
      },
    ],
  };

  it('builds a summary CSV with 1 row per student and properly escaped cells', () => {
    const csv = buildExamSummaryResultsCsv(sampleResults);
    const lines = csv.trim().split('\r\n');

    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe(
      'Student Code,Full Name,Email,Status,Attempts Used,Best Score,Latest Submitted At,Feedback Comment',
    );
    expect(lines[1]).toBe(
      '22110001,Nguyen Van A,a@school.edu.vn,GRADED,2,8.50,2026-11-12T08:30:00Z,"Well done, good job"',
    );
    expect(lines[2]).toBe(
      '22110002,Tran Thi B,b@school.edu.vn,NOT_STARTED,0,,,',
    );
  });

  it('builds a detailed attempts CSV with 1 row per attempt plus NOT_STARTED students', () => {
    const csv = buildExamDetailedAttemptsCsv(sampleResults);
    const lines = csv.trim().split('\r\n');

    expect(lines).toHaveLength(4);
    expect(lines[0]).toBe(
      'Student Code,Full Name,Email,Attempt #,Status,Started At,Submitted At,Correct Count,Total Questions,Score,Feedback Comment',
    );
    expect(lines[1]).toContain('22110001,Nguyen Van A,a@school.edu.vn,1,COMPLETED');
    expect(lines[2]).toContain('22110001,Nguyen Van A,a@school.edu.vn,2,COMPLETED');
    expect(lines[3]).toContain('22110002,Tran Thi B,b@school.edu.vn,0,NOT_STARTED');
  });
});
