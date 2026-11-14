import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Repository } from 'typeorm';
import type { AssignmentSubmissionFile } from '../entities/assignment-submission-file.entity.js';
import type { AssignmentSubmission } from '../entities/assignment-submission.entity.js';
import { SubmissionRepository } from './submission.repository.js';

type Mock = ReturnType<typeof vi.fn>;

describe('SubmissionRepository', () => {
  let repository: SubmissionRepository;
  let managerMock: {
    findOne: Mock;
    create: Mock;
    save: Mock;
    delete: Mock;
    insert: Mock;
  };
  let submissionOrm: {
    manager: { transaction: Mock };
    findOne: Mock;
    find: Mock;
    count: Mock;
    update: Mock;
  };
  let fileLinkOrm: { find: Mock };

  beforeEach(() => {
    managerMock = {
      findOne: vi.fn().mockResolvedValue(null),
      create: vi.fn((_entity: unknown, data: object) => ({ id: 'sub-1', ...data })),
      save: vi.fn(async (_entityOrData: unknown, maybeData?: object) =>
        maybeData ?? _entityOrData,
      ),
      delete: vi.fn().mockResolvedValue(undefined),
      insert: vi.fn().mockResolvedValue(undefined),
    };
    submissionOrm = {
      manager: {
        transaction: vi.fn(async (cb: (m: typeof managerMock) => Promise<unknown>) =>
          cb(managerMock),
        ),
      },
      findOne: vi.fn(),
      find: vi.fn(),
      count: vi.fn(),
      update: vi.fn().mockResolvedValue(undefined),
    };
    fileLinkOrm = {
      find: vi.fn(),
    };

    repository = new SubmissionRepository(
      submissionOrm as unknown as Repository<AssignmentSubmission>,
      fileLinkOrm as unknown as Repository<AssignmentSubmissionFile>,
    );
  });

  it('finds submissions by student, id, assignment, assignments list, and count', async () => {
    submissionOrm.findOne.mockResolvedValue({ id: 'sub-1' });
    expect(await repository.findByStudent('a-1', 's-1')).toEqual({ id: 'sub-1' });
    expect(await repository.findById('sub-1')).toEqual({ id: 'sub-1' });

    submissionOrm.find.mockResolvedValue([{ id: 'sub-1' }]);
    expect(await repository.findAllByAssignment('a-1')).toHaveLength(1);

    expect(await repository.findByAssignments([])).toEqual([]);
    expect(await repository.findByAssignments(['a-1'])).toHaveLength(1);

    expect(await repository.findByStudentInAssignments('s-1', [])).toEqual([]);
    expect(
      await repository.findByStudentInAssignments('s-1', ['a-1']),
    ).toHaveLength(1);

    submissionOrm.count.mockResolvedValue(7);
    expect(await repository.count('a-1')).toBe(7);
  });

  it('collects file ids for one or many submissions', async () => {
    fileLinkOrm.find.mockResolvedValueOnce([{ fileId: 'f-1' }]);
    expect(await repository.findFileIds('sub-1')).toEqual(['f-1']);

    const emptyMap = await repository.findFileIdsBySubmissions([]);
    expect(emptyMap.size).toBe(0);

    fileLinkOrm.find.mockResolvedValueOnce([
      { submissionId: 'sub-1', fileId: 'f-1' },
      { submissionId: 'sub-1', fileId: 'f-2' },
    ]);
    const grouped = await repository.findFileIdsBySubmissions(['sub-1']);
    expect(grouped.get('sub-1')).toEqual(['f-1', 'f-2']);
  });

  it('saves a new submission with files, updates an existing one without files, and saves grade', async () => {
    const now = new Date('2026-11-12T10:00:00Z');
    const created = await repository.save('a-1', 'stu-1', ['f-1'], null, now);
    expect(created.id).toBe('sub-1');
    expect(managerMock.insert).toHaveBeenCalledTimes(1);

    managerMock.insert.mockClear();
    managerMock.findOne.mockResolvedValue({ id: 'sub-1', assignmentId: 'a-1' });
    const updated = await repository.save('a-1', 'stu-1', [], 'My text', now);
    expect(updated.answerText).toBe('My text');
    expect(managerMock.insert).not.toHaveBeenCalled();

    await repository.saveGrade('sub-1', 9.5, 'Good', now);
    expect(submissionOrm.update).toHaveBeenCalledWith(
      { id: 'sub-1' },
      { score: 9.5, comment: 'Good', gradedAt: now, gradedNotified: false },
    );
  });
});

