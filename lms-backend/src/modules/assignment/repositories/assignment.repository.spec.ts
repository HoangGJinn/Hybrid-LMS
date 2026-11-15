import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Repository } from 'typeorm';
import type { AssignmentFile } from '../entities/assignment-file.entity.js';
import type { Assignment } from '../entities/assignment.entity.js';
import { SubmissionType } from '../enums/submission-type.enum.js';
import { AssignmentRepository } from './assignment.repository.js';

type Mock = ReturnType<typeof vi.fn>;

describe('AssignmentRepository', () => {
  let repository: AssignmentRepository;
  let managerMock: {
    create: Mock;
    save: Mock;
    insert: Mock;
    update: Mock;
    delete: Mock;
    findOne: Mock;
  };
  let assignmentOrm: {
    manager: { transaction: Mock };
    findOne: Mock;
    find: Mock;
    delete: Mock;
  };
  let fileLinkOrm: { find: Mock };

  const input = {
    title: 'Lab 1',
    instruction: 'Do it',
    openAt: new Date('2026-11-01T00:00:00Z'),
    endAt: new Date('2026-11-10T00:00:00Z'),
    submissionType: SubmissionType.FILE,
    acceptedExtensions: ['pdf'],
    submissionNote: null,
  };

  beforeEach(() => {
    managerMock = {
      create: vi.fn((_entity: unknown, data: object) => ({ id: 'assign-1', ...data })),
      save: vi.fn(async (data: object) => data),
      insert: vi.fn().mockResolvedValue(undefined),
      update: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      findOne: vi.fn().mockResolvedValue({ id: 'assign-1', ...input }),
    };
    assignmentOrm = {
      manager: {
        transaction: vi.fn(async (cb: (m: typeof managerMock) => Promise<unknown>) =>
          cb(managerMock),
        ),
      },
      findOne: vi.fn(),
      find: vi.fn(),
      delete: vi.fn().mockResolvedValue(undefined),
    };
    fileLinkOrm = {
      find: vi.fn(),
    };

    repository = new AssignmentRepository(
      assignmentOrm as unknown as Repository<Assignment>,
      fileLinkOrm as unknown as Repository<AssignmentFile>,
    );
  });

  it('creates an assignment with and without attached files inside a transaction', async () => {
    const withFiles = await repository.create(input, ['f-1', 'f-2']);
    expect(withFiles.id).toBe('assign-1');
    expect(managerMock.insert).toHaveBeenCalledTimes(1);

    managerMock.insert.mockClear();
    await repository.create(input, []);
    expect(managerMock.insert).not.toHaveBeenCalled();
  });

  it('updates assignment fields, unlinks removed files, and links added files', async () => {
    const updated = await repository.update('assign-1', input, ['f-old'], ['f-new']);
    expect(updated?.id).toBe('assign-1');
    expect(managerMock.update).toHaveBeenCalledTimes(1);
    expect(managerMock.delete).toHaveBeenCalledTimes(1);
    expect(managerMock.insert).toHaveBeenCalledTimes(1);

    managerMock.delete.mockClear();
    managerMock.insert.mockClear();
    managerMock.findOne.mockResolvedValue(null);
    expect(await repository.update('missing', input, [], [])).toBeNull();
    expect(managerMock.delete).not.toHaveBeenCalled();
    expect(managerMock.insert).not.toHaveBeenCalled();
  });

  it('finds by id, ids, fileIds, and deletes by id', async () => {
    assignmentOrm.findOne.mockResolvedValue({ id: 'assign-1' });
    expect(await repository.findById('assign-1')).toEqual({ id: 'assign-1' });

    expect(await repository.findByIds([])).toEqual([]);
    expect(assignmentOrm.find).not.toHaveBeenCalled();

    assignmentOrm.find.mockResolvedValue([{ id: 'assign-1' }]);
    expect(await repository.findByIds(['assign-1'])).toHaveLength(1);

    fileLinkOrm.find.mockResolvedValue([{ fileId: 'f-1' }, { fileId: 'f-2' }]);
    expect(await repository.findFileIds('assign-1')).toEqual(['f-1', 'f-2']);

    await repository.deleteById('assign-1');
    expect(assignmentOrm.delete).toHaveBeenCalledWith({ id: 'assign-1' });
  });
});

