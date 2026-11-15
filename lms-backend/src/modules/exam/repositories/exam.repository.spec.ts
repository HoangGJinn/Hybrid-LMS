import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Repository } from 'typeorm';
import type { ExamQuestionOption } from '../entities/exam-question-option.entity.js';
import type { ExamQuestion } from '../entities/exam-question.entity.js';
import type { ExamSchedule } from '../entities/exam-schedule.entity.js';
import type { ExamSession } from '../entities/exam-session.entity.js';
import { ExamFormat } from '../enums/exam-format.enum.js';
import { ExamRepository } from './exam.repository.js';

type Mock = ReturnType<typeof vi.fn>;

describe('ExamRepository', () => {
  let repository: ExamRepository;
  let managerMock: {
    create: Mock;
    save: Mock;
    insert: Mock;
    findOne: Mock;
    count: Mock;
    update: Mock;
    delete: Mock;
    findOneByOrFail: Mock;
  };
  let examOrm: {
    manager: { transaction: Mock };
    findOne: Mock;
    find: Mock;
    delete: Mock;
  };
  let questionOrm: { count: Mock; find: Mock };
  let optionOrm: { find: Mock };
  let sessionOrm: { exists: Mock; count: Mock };

  const sampleInput = {
    classId: 'c-1',
    examName: 'Midterm',
    startTime: new Date('2026-11-01T08:00:00Z'),
    endTime: new Date('2026-11-02T08:00:00Z'),
    durationMinutes: 45,
    format: ExamFormat.MULTIPLE_CHOICE,
    fileQuestionId: null,
    maxAttempts: 2,
    showResults: true,
    shuffleQuestions: false,
    shuffleOptions: false,
    questions: [
      {
        content: 'Q1',
        options: [
          { content: 'A', isCorrect: true },
          { content: 'B', isCorrect: false },
        ],
      },
    ],
  };

  beforeEach(() => {
    managerMock = {
      create: vi.fn((_entity: unknown, data: object) => ({ id: 'ex-1', ...data })),
      save: vi.fn(async (data: object) => data),
      insert: vi.fn().mockResolvedValue(undefined),
      findOne: vi.fn().mockResolvedValue({ id: 'ex-1', fileQuestionId: 'old-f' }),
      count: vi.fn().mockResolvedValue(0),
      update: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      findOneByOrFail: vi.fn().mockResolvedValue({ id: 'ex-1', examName: 'Updated' }),
    };
    examOrm = {
      manager: {
        transaction: vi.fn(async (cb: (m: typeof managerMock) => Promise<unknown>) =>
          cb(managerMock),
        ),
      },
      findOne: vi.fn(),
      find: vi.fn(),
      delete: vi.fn().mockResolvedValue(undefined),
    };
    questionOrm = {
      count: vi.fn(),
      find: vi.fn(),
    };
    optionOrm = {
      find: vi.fn(),
    };
    sessionOrm = {
      exists: vi.fn(),
      count: vi.fn(),
    };

    repository = new ExamRepository(
      examOrm as unknown as Repository<ExamSchedule>,
      questionOrm as unknown as Repository<ExamQuestion>,
      optionOrm as unknown as Repository<ExamQuestionOption>,
      sessionOrm as unknown as Repository<ExamSession>,
    );
  });

  it('creates exams with and without questions inside a transaction', async () => {
    const created = await repository.create(sampleInput);
    expect(created.id).toBe('ex-1');
    expect(managerMock.insert).toHaveBeenCalledTimes(2);

    managerMock.insert.mockClear();
    await repository.create({ ...sampleInput, questions: [] });
    expect(managerMock.insert).not.toHaveBeenCalled();
  });

  it('updates schedule metadata only, replaces content when provided, and returns null if missing', async () => {
    managerMock.findOne.mockResolvedValueOnce(null);
    expect(
      await repository.update('missing', () => ({
        examName: 'X',
        startTime: sampleInput.startTime,
        endTime: sampleInput.endTime,
        durationMinutes: 30,
        maxAttempts: 1,
        showResults: false,
      })),
    ).toBeNull();

    const metaRes = await repository.update('ex-1', () => ({
      examName: 'Updated',
      startTime: sampleInput.startTime,
      endTime: sampleInput.endTime,
      durationMinutes: 30,
      maxAttempts: 1,
      showResults: false,
    }));
    expect(metaRes?.previousFileId).toBe('old-f');
    expect(managerMock.delete).not.toHaveBeenCalled();

    await repository.update('ex-1', () => ({
      examName: 'Updated Content',
      startTime: sampleInput.startTime,
      endTime: sampleInput.endTime,
      durationMinutes: 30,
      maxAttempts: 1,
      showResults: false,
      content: {
        format: ExamFormat.MULTIPLE_CHOICE,
        fileQuestionId: null,
        shuffleQuestions: true,
        shuffleOptions: true,
        questions: sampleInput.questions,
      },
    }));
    expect(managerMock.delete).toHaveBeenCalledTimes(1);
    expect(managerMock.insert).toHaveBeenCalledTimes(2);
  });

  it('handles findById, findByIds, findByClassIdsAndFormat, countQuestions, findContent, session checks, and deleteById', async () => {
    examOrm.findOne.mockResolvedValue({ id: 'ex-1' });
    expect(await repository.findById('ex-1')).toEqual({ id: 'ex-1' });

    expect(await repository.findByIds([])).toEqual([]);
    examOrm.find.mockResolvedValueOnce([{ id: 'ex-1' }]);
    expect(await repository.findByIds(['ex-1'])).toHaveLength(1);

    expect(
      await repository.findByClassIdsAndFormat([], ExamFormat.FILE),
    ).toEqual([]);
    examOrm.find.mockResolvedValueOnce([{ id: 'ex-1' }]);
    expect(
      await repository.findByClassIdsAndFormat(['c-1'], ExamFormat.FILE),
    ).toHaveLength(1);

    questionOrm.count.mockResolvedValue(5);
    expect(await repository.countQuestions('ex-1')).toBe(5);

    questionOrm.find.mockResolvedValueOnce([]);
    const emptyContent = await repository.findContent('ex-1');
    expect(emptyContent.questions).toEqual([]);
    expect(optionOrm.find).not.toHaveBeenCalled();

    questionOrm.find.mockResolvedValueOnce([{ id: 'q-1' }]);
    optionOrm.find.mockResolvedValueOnce([
      { id: 'o-1', questionId: 'q-1' },
      { id: 'o-2', questionId: 'q-1' },
    ]);
    const loadedContent = await repository.findContent('ex-1');
    expect(loadedContent.optionsByQuestionId.get('q-1')).toHaveLength(2);

    sessionOrm.exists.mockResolvedValue(true);
    sessionOrm.count.mockResolvedValue(4);
    expect(await repository.hasSessions('ex-1')).toBe(true);
    expect(await repository.countSessions('ex-1')).toBe(4);

    await repository.deleteById('ex-1');
    expect(examOrm.delete).toHaveBeenCalledWith({ id: 'ex-1' });
  });
});

