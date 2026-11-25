import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuditFacade } from '../../../shared/audit/index.js';
import { AuditAction } from '../../../shared/audit/index.js';
import type { SemesterRepository } from '../repositories/semester.repository.js';
import { SemesterImportService } from './semester-import.service.js';

type Mock = ReturnType<typeof vi.fn>;

const row = (line: number, overrides: Record<string, string | undefined> = {}) => ({
  line,
  semesterCode: `2026-${line}`,
  name: `Semester ${line}`,
  startDate: '01/09/2026',
  endDate: '31/12/2026',
  ...overrides,
});

describe('SemesterImportService', () => {
  let service: SemesterImportService;
  let repo: Record<'findExistingCodes' | 'createMany', Mock>;
  let audit: { record: Mock };

  beforeEach(() => {
    repo = {
      findExistingCodes: vi.fn().mockResolvedValue(new Set()),
      createMany: vi.fn().mockResolvedValue(undefined),
    };
    audit = { record: vi.fn().mockResolvedValue(undefined) };
    service = new SemesterImportService(
      repo as unknown as SemesterRepository,
      audit as unknown as AuditFacade,
    );
  });

  it('previews without writing or auditing', async () => {
    const result = await service.importSemesters({ rows: [row(2)], dryRun: true });
    expect(result).toMatchObject({ dryRun: true, created: 1 });
    expect(repo.createMany).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('stores whole days in Vietnam time: 00:00 on the first day to 23:59:59.999 on the last', async () => {
    await service.importSemesters({ rows: [row(2)] });
    const [[created]] = repo.createMany.mock.calls as [[Record<string, unknown>[]]];
    expect(created[0]).toMatchObject({ semesterCode: '2026-2', name: 'Semester 2' });
    expect((created[0].startDate as Date).toISOString()).toBe('2026-08-31T17:00:00.000Z');
    expect((created[0].endDate as Date).toISOString()).toBe('2026-12-31T16:59:59.999Z');
  });

  it('accepts yyyy-MM-dd as well as dd/MM/yyyy', async () => {
    const result = await service.importSemesters({
      rows: [row(2, { startDate: '2026-09-01', endDate: '2026-12-31' })],
    });
    expect(result.created).toBe(1);
  });

  it('audits a real import with the Vietnam-time dates', async () => {
    await service.importSemesters({ rows: [row(2)] });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AuditAction.SEMESTER_IMPORTED,
        metadata: expect.objectContaining({
          created: 1,
          semesters: [
            { semesterCode: '2026-2', startDate: '01/09/2026', endDate: '31/12/2026' },
          ],
        }),
      }),
    );
  });

  it('allows a one-day semester but not an end before the start', async () => {
    const result = await service.importSemesters({
      rows: [
        row(2, { startDate: '05/09/2026', endDate: '05/09/2026' }),
        row(3, { startDate: '06/09/2026', endDate: '05/09/2026' }),
      ],
    });
    expect(result.rows.map((r) => r.status)).toEqual(['created', 'error']);
    expect(result.rows[1].message).toBe('Start date must be before the end date');
  });

  it.each([
    [{ semesterCode: undefined }, 'Semester code is required'],
    [{ name: undefined }, 'Semester name is required'],
    [{ startDate: undefined }, 'Start date is required'],
    [{ endDate: undefined }, 'End date is required'],
    [{ startDate: '31/02/2026' }, 'Start date is not a valid date'],
    [{ endDate: 'someday' }, 'End date is not a valid date'],
    [{ semesterCode: 'X'.repeat(51) }, 'longer than 50'],
  ])('rejects a bad row %#', async (overrides, message) => {
    const result = await service.importSemesters({ rows: [row(2, overrides)] });
    expect(result.rows[0].status).toBe('error');
    expect(result.rows[0].message).toContain(message);
  });

  it('skips existing and repeated codes', async () => {
    repo.findExistingCodes.mockResolvedValue(new Set(['2026-2']));
    const result = await service.importSemesters({
      rows: [row(2), row(3), row(4, { semesterCode: '2026-3' })],
    });
    expect(result.rows.map((r) => r.status)).toEqual(['skipped', 'created', 'skipped']);
    expect(result.rows[2].message).toBe('Duplicate of row 3 in the file');
  });
});
