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
  ImportSubjectRowDto,
  ImportSubjectsDto,
} from '../dto/import-subjects.dto.js';
import { SubjectRepository } from '../repositories/subject.repository.js';
import type {
  CatalogImportResult,
  CatalogImportRowResult,
  CatalogImportRowStatus,
} from '../types/catalog-import.type.js';

const MAX_SUBJECT_CODE_LENGTH = 50;
const MAX_SUBJECT_NAME_LENGTH = 255;

interface ValidSubject {
  readonly subjectCode: string;
  readonly name: string;
  readonly description: string | null;
}

interface PlannedSubject {
  readonly result: CatalogImportRowResult;
  readonly valid: ValidSubject | null;
}

/**
 * Bulk "Create subject" from an Excel file (admin only). A subject whose code already exists, or
 * that appears twice in the file, is skipped instead of created; `dryRun` shows all of that before
 * anything is written, and the real run inserts every valid row in one statement.
 */
@Injectable()
export class SubjectImportService {
  constructor(
    private readonly subjectRepo: SubjectRepository,
    @Optional() private readonly auditFacade?: AuditFacade,
  ) {}

  async importSubjects(dto: ImportSubjectsDto): Promise<CatalogImportResult> {
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
        action: AuditAction.SUBJECT_IMPORTED,
        entityType: AuditEntityType.SUBJECT,
        entityLabel: `${toCreate.length} subjects imported`,
        summary: `Imported ${summary.created} subject(s) (${summary.skipped} skipped, ${summary.failed} failed)`,
        metadata: {
          total: summary.total,
          created: summary.created,
          skipped: summary.skipped,
          failed: summary.failed,
          subjectCodes: toCreate.map((item) => item.subjectCode),
        },
      });
    }
    return summary;
  }

  private async plan(
    rows: readonly ImportSubjectRowDto[],
  ): Promise<PlannedSubject[]> {
    const normalized = rows.map((row) => ({
      line: row.line,
      subjectCode: emptyToNull(row.subjectCode),
      name: emptyToNull(row.name),
      description: emptyToNull(row.description),
    }));
    const existing = await this.subjectRepo.findExistingCodes([
      ...new Set(
        normalized
          .map((row) => row.subjectCode)
          .filter((code): code is string => code !== null),
      ),
    ]);

    const firstLineOfCode = new Map<string, number>();
    return normalized.map((row): PlannedSubject => {
      const outcome = (
        status: CatalogImportRowStatus,
        message: string | null,
        valid: ValidSubject | null = null,
      ): PlannedSubject => ({
        result: {
          line: row.line,
          status,
          code: row.subjectCode,
          name: row.name,
          message,
        },
        valid,
      });

      if (!row.subjectCode) return outcome('error', 'Subject code is required');
      if (row.subjectCode.length > MAX_SUBJECT_CODE_LENGTH) {
        return outcome(
          'error',
          `Subject code is longer than ${MAX_SUBJECT_CODE_LENGTH} characters`,
        );
      }
      if (!row.name) return outcome('error', 'Subject name is required');
      if (row.name.length > MAX_SUBJECT_NAME_LENGTH) {
        return outcome(
          'error',
          `Subject name is longer than ${MAX_SUBJECT_NAME_LENGTH} characters`,
        );
      }
      const key = row.subjectCode.toLowerCase();
      if (existing.has(key)) {
        return outcome('skipped', `Subject code ${row.subjectCode} already exists`);
      }
      const earlier = firstLineOfCode.get(key);
      if (earlier !== undefined) {
        return outcome('skipped', `Duplicate of row ${earlier} in the file`);
      }
      firstLineOfCode.set(key, row.line);
      return outcome('created', null, {
        subjectCode: row.subjectCode,
        name: row.name,
        description: row.description,
      });
    });
  }

  private async save(valid: readonly ValidSubject[]): Promise<void> {
    try {
      await this.subjectRepo.createMany(valid.map((item) => ({ ...item })));
    } catch (error) {
      // Someone created one of these codes after the check; nothing was inserted.
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          'A subject code in this file was created by someone else in the meantime. Check the file again.',
        );
      }
      throw error;
    }
  }
}
