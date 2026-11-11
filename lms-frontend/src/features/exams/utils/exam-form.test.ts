import { describe, expect, it } from 'vitest';
import {
  addOption,
  createEmptyQuestion,
  hasExamFormErrors,
  isQuestionComplete,
  removeOption,
  toDraftQuestions,
  toNewExamInput,
  validateExamForm,
  type ExamEditContext,
  type ExamFormValues,
  type ExamQuestionDraft,
} from './exam-form';

const NOW = new Date('2026-11-10T08:00:00');

const buildQuestion = (
  overrides: Partial<ExamQuestionDraft> = {},
): ExamQuestionDraft => ({
  key: 'q',
  content: 'What is 2 + 2?',
  options: ['3', '4', '5', '6'],
  correctIndex: 1,
  ...overrides,
});

const buildFile = (type: string, size = 1000): File => {
  const file = new File(['x'], 'exam.pdf', { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

const buildValues = (
  overrides: Partial<ExamFormValues> = {},
): ExamFormValues => ({
  examName: 'Midterm',
  startTime: '2026-11-12T08:00',
  endTime: '2026-11-12T10:00',
  durationMinutes: '60',
  format: 'MULTIPLE_CHOICE',
  questions: [buildQuestion()],
  file: null,
  ...overrides,
});

describe('createEmptyQuestion', () => {
  it('should start with four empty answers and no correct one chosen', () => {
    const actualQuestion = createEmptyQuestion();

    expect(actualQuestion.options).toEqual(['', '', '', '']);
    expect(actualQuestion.correctIndex).toBeNull();
  });

  it('should give every question its own key', () => {
    expect(createEmptyQuestion().key).not.toBe(createEmptyQuestion().key);
  });
});

describe('addOption', () => {
  it('should append an empty answer', () => {
    const actual = addOption(buildQuestion());

    expect(actual.options).toEqual(['3', '4', '5', '6', '']);
    expect(actual.correctIndex).toBe(1);
  });

  it('should stop at six answers', () => {
    const six = buildQuestion({ options: ['a', 'b', 'c', 'd', 'e', 'f'] });

    expect(addOption(six)).toBe(six);
  });
});

describe('removeOption', () => {
  it('should shift the correct answer up when an earlier answer is removed', () => {
    const actual = removeOption(buildQuestion({ correctIndex: 2 }), 0);

    expect(actual.options).toEqual(['4', '5', '6']);
    expect(actual.correctIndex).toBe(1);
  });

  it('should keep the correct answer when a later answer is removed', () => {
    const actual = removeOption(buildQuestion({ correctIndex: 1 }), 3);

    expect(actual.options).toEqual(['3', '4', '5']);
    expect(actual.correctIndex).toBe(1);
  });

  it('should clear the correct answer when that answer is removed', () => {
    const actual = removeOption(buildQuestion({ correctIndex: 1 }), 1);

    expect(actual.options).toEqual(['3', '5', '6']);
    expect(actual.correctIndex).toBeNull();
  });

  it('should keep no correct answer when none was chosen', () => {
    expect(removeOption(buildQuestion({ correctIndex: null }), 0).correctIndex).toBeNull();
  });

  it('should stop at two answers', () => {
    const two = buildQuestion({ options: ['a', 'b'], correctIndex: 0 });

    expect(removeOption(two, 0)).toBe(two);
  });
});

describe('validateExamForm', () => {
  it('should accept questions with 2 to 6 answers', () => {
    const questions = [2, 3, 6].map((count) =>
      buildQuestion({
        options: Array.from({ length: count }, (_, i) => `answer ${i}`),
        correctIndex: 0,
      }),
    );

    expect(hasExamFormErrors(validateExamForm(buildValues({ questions }), NOW))).toBe(false);
  });

  it.each([1, 7])('should reject a question with %i answers', (count) => {
    const question = buildQuestion({
      options: Array.from({ length: count }, (_, i) => `answer ${i}`),
      correctIndex: 0,
    });

    const errors = validateExamForm(buildValues({ questions: [question] }), NOW);

    expect(errors.questionErrors[0].optionCount).toMatch(/2 to 6 answers/);
  });

  it('should accept a complete multiple-choice exam', () => {
    expect(hasExamFormErrors(validateExamForm(buildValues(), NOW))).toBe(false);
  });

  describe('name', () => {
    it('should reject an empty or blank name', () => {
      for (const examName of ['', '   ']) {
        expect(
          validateExamForm(buildValues({ examName }), NOW).examName,
        ).toMatch(/exam name/);
      }
    });

    it('should reject a name above 255 characters', () => {
      const errors = validateExamForm(
        buildValues({ examName: 'x'.repeat(256) }),
        NOW,
      );

      expect(errors.examName).toMatch(/255/);
    });
  });

  describe('schedule', () => {
    it('should reject times that are not set', () => {
      const errors = validateExamForm(
        buildValues({ startTime: '', endTime: '' }),
        NOW,
      );

      expect(errors.startTime).toBeDefined();
      expect(errors.endTime).toBeDefined();
    });

    it('should reject a closing time that is not after the opening time', () => {
      const errors = validateExamForm(
        buildValues({ endTime: '2026-11-12T08:00' }),
        NOW,
      );

      expect(errors.endTime).toMatch(/after the opening/);
    });

    it('should reject an exam that has already closed', () => {
      const errors = validateExamForm(
        buildValues({
          startTime: '2026-11-01T08:00',
          endTime: '2026-11-01T10:00',
        }),
        NOW,
      );

      expect(errors.endTime).toMatch(/future/);
    });

    it('should accept an exam that is already open', () => {
      const errors = validateExamForm(
        buildValues({
          startTime: '2026-11-09T08:00',
          endTime: '2026-11-12T10:00',
        }),
        NOW,
      );

      expect(errors.endTime).toBeUndefined();
    });
  });

  describe('duration', () => {
    it.each(['', '  ', 'abc', '0', '-5', '1.5', '481'])(
      'should reject "%s"',
      (durationMinutes) => {
        expect(
          validateExamForm(buildValues({ durationMinutes }), NOW).durationMinutes,
        ).toBeDefined();
      },
    );

    it('should reject a duration longer than the time between opening and closing', () => {
      const errors = validateExamForm(
        buildValues({ durationMinutes: '121' }),
        NOW,
      );

      expect(errors.durationMinutes).toMatch(/120 minutes/);
    });

    it('should accept a duration that fills the whole window', () => {
      const errors = validateExamForm(
        buildValues({ durationMinutes: '120' }),
        NOW,
      );

      expect(errors.durationMinutes).toBeUndefined();
    });
  });

  describe('multiple-choice questions', () => {
    it('should ask for at least one question', () => {
      const errors = validateExamForm(buildValues({ questions: [] }), NOW);

      expect(errors.questions).toMatch(/at least one/);
    });

    it('should reject more than 100 questions', () => {
      const questions = Array.from({ length: 101 }, () => buildQuestion());

      expect(validateExamForm(buildValues({ questions }), NOW).questions).toMatch(
        /100/,
      );
    });

    it('should point at the question that has no text', () => {
      const errors = validateExamForm(
        buildValues({
          questions: [buildQuestion(), buildQuestion({ content: '  ' })],
        }),
        NOW,
      );

      expect(errors.questionErrors[0]).toBeUndefined();
      expect(errors.questionErrors[1].content).toMatch(/Enter the question/);
    });

    it('should point at the empty answers', () => {
      const errors = validateExamForm(
        buildValues({
          questions: [buildQuestion({ options: ['3', '', '5', ' '] })],
        }),
        NOW,
      );

      expect(Object.keys(errors.questionErrors[0].options ?? {})).toEqual([
        '1',
        '3',
      ]);
    });

    it('should flag a repeated answer, ignoring case and spaces, on the later one', () => {
      const errors = validateExamForm(
        buildValues({
          questions: [
            buildQuestion({ options: ['Paris', 'Rome', ' paris ', 'Oslo'] }),
          ],
        }),
        NOW,
      );

      expect(errors.questionErrors[0].options).toEqual({
        2: 'This answer repeats another one',
      });
    });

    it('should ask for the correct answer to be chosen', () => {
      const errors = validateExamForm(
        buildValues({ questions: [buildQuestion({ correctIndex: null })] }),
        NOW,
      );

      expect(errors.questionErrors[0].correct).toMatch(/correct answer/);
    });

    it('should reject a question or answer above its length limit', () => {
      const errors = validateExamForm(
        buildValues({
          questions: [
            buildQuestion({
              content: 'x'.repeat(2001),
              options: ['a', 'b', 'c', 'y'.repeat(501)],
            }),
          ],
        }),
        NOW,
      );

      expect(errors.questionErrors[0].content).toMatch(/2000/);
      expect(errors.questionErrors[0].options?.[3]).toMatch(/500/);
    });

    it('should ignore a stale file when the format is multiple choice', () => {
      const errors = validateExamForm(
        buildValues({ file: buildFile('application/zip') }),
        NOW,
      );

      expect(errors.file).toBeUndefined();
    });
  });

  describe('question file', () => {
    const fileValues = (file: File | null) =>
      buildValues({ format: 'FILE', questions: [], file });

    it('should accept a PDF', () => {
      const errors = validateExamForm(
        fileValues(buildFile('application/pdf')),
        NOW,
      );

      expect(hasExamFormErrors(errors)).toBe(false);
    });

    it('should ask for a file', () => {
      expect(validateExamForm(fileValues(null), NOW).file).toMatch(/Choose/);
    });

    it('should reject a format that is not PDF, DOC or DOCX', () => {
      const errors = validateExamForm(
        fileValues(buildFile('application/zip')),
        NOW,
      );

      expect(errors.file).toMatch(/PDF/);
    });

    it('should ignore the typed questions when the format is file', () => {
      const errors = validateExamForm(
        buildValues({
          format: 'FILE',
          questions: [buildQuestion({ content: '' })],
          file: buildFile('application/pdf'),
        }),
        NOW,
      );

      expect(hasExamFormErrors(errors)).toBe(false);
    });

    it('should accept an edited file exam that keeps its existing file', () => {
      const edit: ExamEditContext = {
        exam: {
          startTime: new Date('2026-11-12T08:00').toISOString(),
          endTime: new Date('2026-11-12T10:00').toISOString(),
          durationMinutes: 60,
          status: 'UPCOMING',
          isContentLocked: false,
        },
        hasKeptFile: true,
      };

      expect(
        hasExamFormErrors(validateExamForm(fileValues(null), NOW, edit)),
      ).toBe(false);
    });
  });

  describe('when editing a locked exam', () => {
    const lockedEdit = (
      status: 'UPCOMING' | 'OPEN' | 'CLOSED' = 'OPEN',
    ): ExamEditContext => ({
      exam: {
        startTime: new Date('2026-11-10T07:00').toISOString(),
        endTime: new Date('2026-11-10T10:00').toISOString(),
        durationMinutes: 60,
        status,
        isContentLocked: true,
      },
      hasKeptFile: false,
    });

    it('should accept a later closing time and longer duration and ignore questions', () => {
      const errors = validateExamForm(
        buildValues({
          startTime: '',
          endTime: '2026-11-10T11:00',
          durationMinutes: '90',
          questions: [],
        }),
        NOW,
        lockedEdit(),
      );

      expect(hasExamFormErrors(errors)).toBe(false);
    });

    it('should reject an earlier closing time or shorter duration', () => {
      const errors = validateExamForm(
        buildValues({
          endTime: '2026-11-10T09:59',
          durationMinutes: '59',
        }),
        NOW,
        lockedEdit(),
      );

      expect(errors.endTime).toMatch(/only be moved later/);
      expect(errors.durationMinutes).toMatch(/only be made longer/);
    });

    it('should reject a duration longer than the extended window', () => {
      const errors = validateExamForm(
        buildValues({
          endTime: '2026-11-10T10:00',
          durationMinutes: '200',
        }),
        NOW,
        lockedEdit(),
      );

      expect(errors.durationMinutes).toMatch(/180 minutes/);
    });

    it('should validate only the name when the exam is closed', () => {
      const errors = validateExamForm(
        buildValues({
          examName: 'Renamed',
          endTime: '',
          durationMinutes: '',
          questions: [],
        }),
        NOW,
        lockedEdit('CLOSED'),
      );

      expect(hasExamFormErrors(errors)).toBe(false);
    });
  });
});

describe('isQuestionComplete', () => {
  it('should be true for a complete question and false when any part is missing or repeated', () => {
    expect(isQuestionComplete(buildQuestion())).toBe(true);
    expect(isQuestionComplete(createEmptyQuestion())).toBe(false);
    expect(isQuestionComplete(buildQuestion({ correctIndex: null }))).toBe(false);
    expect(
      isQuestionComplete(buildQuestion({ options: ['Paris', ' paris ', 'Rome', 'Oslo'] })),
    ).toBe(false);
  });
});

describe('toDraftQuestions', () => {
  it('should convert saved questions and start with one blank question when empty', () => {
    expect(toDraftQuestions([])).toHaveLength(1);
    const actual = toDraftQuestions([
      {
        id: 'q-1',
        content: '2 + 2?',
        orderIndex: 0,
        options: [
          { id: 'o-1', content: '3', isCorrect: false },
          { id: 'o-2', content: '4', isCorrect: true },
        ],
      },
    ]);
    expect(actual).toEqual([
      { key: 'q-1', content: '2 + 2?', options: ['3', '4'], correctIndex: 1 },
    ]);
  });
});

describe('toNewExamInput', () => {
  it('should send trimmed text, ISO times and exactly one correct answer per question', () => {
    const actualInput = toNewExamInput(
      buildValues({
        examName: '  Midterm  ',
        questions: [
          buildQuestion({
            content: ' Capital? ',
            options: [' Paris ', 'Rome', 'Oslo', 'Bern'],
            correctIndex: 0,
          }),
        ],
      }),
    );

    expect(actualInput.examName).toBe('Midterm');
    expect(actualInput.startTime).toBe(
      new Date('2026-11-12T08:00').toISOString(),
    );
    expect(actualInput.durationMinutes).toBe(60);
    expect(actualInput.file).toBeNull();
    expect(actualInput.questions).toEqual([
      {
        content: 'Capital?',
        options: [
          { content: 'Paris', isCorrect: true },
          { content: 'Rome', isCorrect: false },
          { content: 'Oslo', isCorrect: false },
          { content: 'Bern', isCorrect: false },
        ],
      },
    ]);
  });

  it('should keep only the file for a file exam', () => {
    const file = buildFile('application/pdf');

    const actualInput = toNewExamInput(
      buildValues({ format: 'FILE', file, questions: [buildQuestion()] }),
    );

    expect(actualInput.file).toBe(file);
    expect(actualInput.questions).toEqual([]);
  });

  it('should drop a stale file for a multiple-choice exam', () => {
    const actualInput = toNewExamInput(
      buildValues({ file: buildFile('application/pdf') }),
    );

    expect(actualInput.file).toBeNull();
  });

  it('should preserve the original schedule when a closed exam is renamed', () => {
    const edit: ExamEditContext = {
      exam: {
        startTime: '2026-11-01T08:00:00.000Z',
        endTime: '2026-11-01T10:00:00.000Z',
        durationMinutes: 60,
        status: 'CLOSED',
        isContentLocked: true,
      },
      hasKeptFile: false,
    };

    const actual = toNewExamInput(
      buildValues({ examName: '  Renamed  ' }),
      edit,
    );

    expect(actual).toMatchObject({
      examName: 'Renamed',
      startTime: '2026-11-01T08:00:00.000Z',
      endTime: '2026-11-01T10:00:00.000Z',
      durationMinutes: 60,
      questions: [],
      file: null,
    });
  });
});
