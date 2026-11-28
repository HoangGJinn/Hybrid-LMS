import { ConflictException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuditFacade } from '../../../shared/audit/index.js';
import { AuditAction } from '../../../shared/audit/index.js';
import type { SubjectRepository } from '../repositories/subject.repository.js';
import { SubjectImportService } from './subject-import.service.js';

type Mock = ReturnType<typeof vi.fn>;

const row = (line: number, overrides: Record<string, string | undefined> = {}) => ({
  line,
  subjectCode: `IT00${line}`,
  name: 'Web programming',
  description: 'Basics',
  ...overrides,
});

describe('SubjectImportService', () => {
  let service: SubjectImportService;
  let repo: Record<'findExistingCodes' | 'createMany', Mock>;
  let audit: { record: Mock };

  beforeEach(() => {
    repo = {
      findExistingCodes: vi.fn().mockResolvedValue(new Set()),
      createMany: vi.fn().mockResolvedValue(undefined),
    };
    audit = { record: vi.fn().mockResolvedValue(undefined) };
    service = new SubjectImportService(
      repo as unknown as SubjectRepository,
      audit as unknown as AuditFacade,
    );
  });

  it('previews without writing or auditing', async () => {
    const result = await service.importSubjects({ rows: [row(2), row(3)], dryRun: true });
    expect(result).toMatchObject({ dryRun: true, total: 2, created: 2, skipped: 0, failed: 0 });
    expect(repo.createMany).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('creates every valid row in one insert and audits it', async () => {
    const result = await service.importSubjects({
      rows: [row(2), row(3, { description: undefined })],
    });
    expect(result.created).toBe(2);
    expect(repo.createMany).toHaveBeenCalledTimes(1);
    expect(repo.createMany).toHaveBeenCalledWith([
      { subjectCode: 'IT002', name: 'Web programming', description: 'Basics' },
      { subjectCode: 'IT003', name: 'Web programming', description: null },
    ]);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AuditAction.SUBJECT_IMPORTED,
        metadata: expect.objectContaining({ created: 2, subjectCodes: ['IT002', 'IT003'] }),
      }),
    );
  });

  it('skips a code that exists, ignoring case', async () => {
    repo.findExistingCodes.mockResolvedValue(new Set(['it002']));
    const result = await service.importSubjects({
      rows: [row(2, { subjectCode: 'IT002' }), row(3)],
    });
    expect(result.rows[0]).toMatchObject({ status: 'skipped' });
    expect(result.rows[0].message).toContain('already exists');
    expect(result.created).toBe(1);
  });

  it('skips a code repeated inside the file and names the first row', async () => {
    const result = await service.importSubjects({
      rows: [row(2, { subjectCode: 'IT100' }), row(5, { subjectCode: 'it100' })],
    });
    expect(result.rows.map((r) => r.status)).toEqual(['created', 'skipped']);
    expect(result.rows[1].message).toBe('Duplicate of row 2 in the file');
  });

  it.each([
    [{ subjectCode: undefined }, 'Subject code is required'],
    [{ name: undefined }, 'Subject name is required'],
    [{ subjectCode: 'X'.repeat(51) }, 'longer than 50'],
    [{ name: 'X'.repeat(256) }, 'longer than 255'],
  ])('rejects a bad row %#', async (overrides, message) => {
    const result = await service.importSubjects({ rows: [row(2, overrides)] });
    expect(result.rows[0].status).toBe('error');
    expect(result.rows[0].message).toContain(message);
    expect(result.failed).toBe(1);
  });

  it('writes nothing and does not audit when no row is valid', async () => {
    await service.importSubjects({ rows: [row(2, { name: undefined })] });
    expect(repo.createMany).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('turns a unique violation into a conflict', async () => {
    const error = Object.assign(new QueryFailedError('insert', [], new Error('dup')), {
      driverError: { code: '23505' },
      code: '23505',
    });
    repo.createMany.mockRejectedValue(error);
    await expect(service.importSubjects({ rows: [row(2)] })).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(audit.record).not.toHaveBeenCalled();
  });
});
