import { ConflictException, Injectable, Optional } from '@nestjs/common';
import {
  AuditAction,
  AuditCategory,
  AuditEntityType,
  AuditFacade,
} from '../../../shared/audit/index.js';
import { isUniqueViolation } from '../../../common/utils/pg-error.util.js';
import { emptyToNull } from '../../../common/utils/string.util.js';
import {
  ImportSemesterRowDto,
  ImportSemestersDto,
} from '../dto/import-semesters.dto.js';
import { SemesterRepository } from '../repositories/semester.repository.js';
import type {
  CatalogImportResult,
  CatalogImportRowResult,
  CatalogImportRowStatus,
} from '../types/catalog-import.type.js';
import {
  endOfVnDay,
  formatVnDate,
  parseCalendarDate,
  startOfVnDay,
} from '../utils/vn-date.util.js';

const MAX_SEMESTER_CODE_LENGTH = 50;
const MAX_SEMESTER_NAME_LENGTH = 255;
const DATE_HINT = 'use dd/MM/yyyy or yyyy-MM-dd';

interface ValidSemester {
  readonly semesterCode: string;
  readonly name: string;
  readonly startDate: Date;
  readonly endDate: Date;
}

interface PlannedSemester {
  readonly result: CatalogImportRowResult;
  readonly valid: ValidSemester | null;
}

/**
 * Bulk "Create semester" from an Excel file (admin only). Dates are whole days in Vietnam time: a
 * semester starts at 00:00 on its first day and ends at 23:59:59.999 on its last day. A semester
 * whose code already exists, or that appears twice in the file, is skipped; `dryRun` previews it all.
 */
@Injectable()
export class SemesterImportService {
  constructor(
    private readonly semesterRepo: SemesterRepository,
    @Optional() private readonly auditFacade?: AuditFacade,
  ) {}

  async importSemesters(dto: ImportSemestersDto): Promise<CatalogImportResult> {
    const dryRun = dto.dryRun ?? false;
    const planned = await this.plan(dto.rows);
    const toCreate = planned.flatMap((item) => (item.valid ? [item.valid] : []));
    if (!dryRun && toCreate.length > 0) await this.save(toCreate);

    const results = planned.map((item) => item.result);
    const count = (status: CatalogImportRowStatus): number =>
      results.filter((result) => result.status === status).length;
    const summary: CatalogImportResult = {
      dryRun,
      total: results.length,
      created: count('created'),
      skipped: count('skipped'),
      failed: count('error'),
      rows: results,
    };
    if (!dryRun && toCreate.length > 0) {
      await this.auditFacade?.record({
        category: AuditCategory.ADMIN,
        action: AuditAction.SEMESTER_IMPORTED,
        entityType: AuditEntityType.SEMESTER,
        entityLabel: `${toCreate.length} semesters imported`,
        summary: `Imported ${summary.created} semester(s) (${summary.skipped} skipped, ${summary.failed} failed)`,
        metadata: {
          total: summary.total,
          created: summary.created,
          skipped: summary.skipped,
          failed: summary.failed,
          semesters: toCreate.map((item) => ({
            semesterCode: item.semesterCode,
            startDate: formatVnDate(item.startDate),
            endDate: formatVnDate(item.endDate),
          })),
        },
      });
    }
    return summary;
  }

  private async plan(
    rows: readonly ImportSemesterRowDto[],
  ): Promise<PlannedSemester[]> {
    const normalized = rows.map((row) => ({
      line: row.line,
      semesterCode: emptyToNull(row.semesterCode),
      name: emptyToNull(row.name),
      startDate: emptyToNull(row.startDate),
      endDate: emptyToNull(row.endDate),
    }));
    const existing = await this.semesterRepo.findExistingCodes([
      ...new Set(
        normalized
          .map((row) => row.semesterCode)
          .filter((code): code is string => code !== null),
      ),
    ]);

    const firstLineOfCode = new Map<string, number>();
    return normalized.map((row): PlannedSemester => {
      const outcome = (
        status: CatalogImportRowStatus,
        message: string | null,
        valid: ValidSemester | null = null,
      ): PlannedSemester => ({
        result: {
          line: row.line,
          status,
          code: row.semesterCode,
          name: row.name,
          message,
        },
        valid,
      });

      if (!row.semesterCode) return outcome('error', 'Semester code is required');
      if (row.semesterCode.length > MAX_SEMESTER_CODE_LENGTH) {
        return outcome(
          'error',
          `Semester code is longer than ${MAX_SEMESTER_CODE_LENGTH} characters`,
        );
      }
      if (!row.name) return outcome('error', 'Semester name is required');
      if (row.name.length > MAX_SEMESTER_NAME_LENGTH) {
        return outcome(
          'error',
          `Semester name is longer than ${MAX_SEMESTER_NAME_LENGTH} characters`,
        );
      }
      if (!row.startDate) return outcome('error', 'Start date is required');
      if (!row.endDate) return outcome('error', 'End date is required');
      const start = parseCalendarDate(row.startDate);
      if (!start) {
        return outcome('error', `Start date is not a valid date (${DATE_HINT})`);
      }
      const end = parseCalendarDate(row.endDate);
      if (!end) {
        return outcome('error', `End date is not a valid date (${DATE_HINT})`);
      }
      const startDate = startOfVnDay(start);
      const endDate = endOfVnDay(end);
      // Same rule as creating one semester by hand: the start must come before the end. Because
      // the end is the last moment of its day, a one-day semester (start = end) is allowed.
      if (startDate >= endDate) {
        return outcome('error', 'Start date must be before the end date');
      }

      const key = row.semesterCode.toLowerCase();
      if (existing.has(key)) {
        return outcome(
          'skipped',
          `Semester code ${row.semesterCode} already exists`,
        );
      }
      const earlier = firstLineOfCode.get(key);
      if (earlier !== undefined) {
        return outcome('skipped', `Duplicate of row ${earlier} in the file`);
      }
      firstLineOfCode.set(key, row.line);
      return outcome('created', null, {
        semesterCode: row.semesterCode,
        name: row.name,
        startDate,
        endDate,
      });
    });
  }

  private async save(valid: readonly ValidSemester[]): Promise<void> {
    try {
      await this.semesterRepo.createMany(valid.map((item) => ({ ...item })));
    } catch (error) {
      // Someone created one of these codes after the check; nothing was inserted.
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          'A semester code in this file was created by someone else in the meantime. Check the file again.',
        );
      }
      throw error;
    }
  }
}
