import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Repository } from 'typeorm';
import type { Document } from '../entities/document.entity.js';
import { DocumentRepository } from './document.repository.js';

type Mock = ReturnType<typeof vi.fn>;

describe('DocumentRepository', () => {
  let repository: DocumentRepository;
  let ormRepo: {
    find: Mock;
    create: Mock;
    save: Mock;
    findOneOrFail: Mock;
    findOne: Mock;
    delete: Mock;
  };

  beforeEach(() => {
    ormRepo = {
      find: vi.fn().mockResolvedValue([{ id: 'd-1' }]),
      create: vi.fn((data: object) => ({ id: 'd-1', ...data })),
      save: vi.fn(async (data: object) => data),
      findOneOrFail: vi.fn().mockResolvedValue({ id: 'd-1', title: 'Doc 1' }),
      findOne: vi.fn().mockResolvedValue({ id: 'd-1' }),
      delete: vi.fn().mockResolvedValue(undefined),
    };
    repository = new DocumentRepository(
      ormRepo as unknown as Repository<Document>,
    );
  });

  it('handles findByIds, create, findById, and deleteById', async () => {
    expect(await repository.findByIds([])).toEqual([]);
    expect(ormRepo.find).not.toHaveBeenCalled();

    expect(await repository.findByIds(['d-1'])).toEqual([{ id: 'd-1' }]);

    const created = await repository.create({
      uploadedBy: 'lec-1',
      title: 'Doc 1',
      fileId: 'f-1',
    });
    expect(created.id).toBe('d-1');

    expect(await repository.findById('d-1')).toEqual({ id: 'd-1' });
    await repository.deleteById('d-1');
    expect(ormRepo.delete).toHaveBeenCalledWith({ id: 'd-1' });
  });
});

