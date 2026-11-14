import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Repository } from 'typeorm';
import type { FileAttachment } from '../entities/file-attachment.entity.js';
import { FileStatus } from '../enums/file-status.enum.js';
import { FileRepository } from './file.repository.js';

type Mock = ReturnType<typeof vi.fn>;

describe('FileRepository', () => {
  let repository: FileRepository;
  let ormRepo: {
    findOne: Mock;
    create: Mock;
    save: Mock;
    update: Mock;
    delete: Mock;
    find: Mock;
  };

  beforeEach(() => {
    ormRepo = {
      findOne: vi.fn(),
      create: vi.fn((data: object) => data),
      save: vi.fn(async (data: object) => data),
      update: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      find: vi.fn().mockResolvedValue([{ id: 'f-1' }]),
    };

    repository = new FileRepository(ormRepo as unknown as Repository<FileAttachment>);
  });

  it('handles findById, createPending, markReady, deleteById, and findByIds', async () => {
    ormRepo.findOne.mockResolvedValue({ id: 'f-1' });
    expect(await repository.findById('f-1')).toEqual({ id: 'f-1' });

    const created = await repository.createPending({
      id: 'f-1',
      ownerId: 'u-1',
      fileName: 'lab.pdf',
      storageKey: 'documents/u-1/f-1.pdf',
      fileType: 'application/pdf',
      fileSize: 100,
    });
    expect(created.status).toBe(FileStatus.PENDING);

    await repository.markReady('f-1');
    expect(ormRepo.update).toHaveBeenCalledWith(
      { id: 'f-1' },
      { status: FileStatus.READY },
    );

    await repository.deleteById('f-1');
    expect(ormRepo.delete).toHaveBeenCalledWith({ id: 'f-1' });

    expect(await repository.findByIds([])).toEqual([]);
    expect(ormRepo.find).not.toHaveBeenCalled();

    expect(await repository.findByIds(['f-1'])).toEqual([{ id: 'f-1' }]);
  });
});

