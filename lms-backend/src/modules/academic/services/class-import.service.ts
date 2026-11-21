import { ConflictException, Injectable } from '@nestjs/common';
import { isUniqueViolation } from '../../../common/utils/pg-error.util.js';
import { emptyToNull } from '../../../common/utils/string.util.js';
import { LecturerSummary } from '../../user/types/lecturer-summary.type.js';
import { UserFacade } from '../../user/facades/user.facade.js';
import {
  ImportClassesDto,
  ImportClassRowDto,
} from '../dto/import-classes.dto.js';
import { Semester } from '../entities/semester.entity.js';
import { Subject } from '../entities/subject.entity.js';
import { ClassRepository } from '../repositories/class.repository.js';
import { SemesterRepository } from '../repositories/semester.repository.js';
import { SubjectRepository } from '../repositories/subject.repository.js';
import {
  ClassImportResult,
  ClassImportRowResult,
  ClassImportRowStatus,
} from '../types/class-import.type.js';

const MAX_CLASS_CODE_LENGTH = 50;
const MAX_CLASS_NAME_LENGTH = 255;

/** An import row after trimming. Codes keep the casing typed in the file; lookups ignore case. */
interface NormalizedRow {
  readonly line: number;
  readonly classCode: string | null;
  readonly name: string | null;
  readonly subjectCode: string | null;
  readonly semesterCode: string | null;
  readonly lecturer: string | null;
}

/** A row that passed validation, with the ids it points at. */
interface ValidRow {
  readonly row: NormalizedRow;
  readonly classCode: string;
  readonly name: string;
  readonly subject: Subject;
  readonly semester: Semester;
  readonly lecturer: LecturerSummary;
}

type Validation =
  | { readonly ok: true; readonly value: ValidRow }
  | { readonly ok: false; readonly message: string };

const unique = <T>(values: T[]): T[] => [...new Set(values)];

const notNull = <T>(value: T | null): value is T => value !== null;

const normalize = (row: ImportClassRowDto): NormalizedRow => ({
  line: row.line,
  classCode: emptyToNull(row.classCode),
  name: emptyToNull(row.name),
  subjectCode: emptyToNull(row.subjectCode),
  semesterCode: emptyToNull(row.semesterCode),
  lecturer: emptyToNull(row.lecturer),
});

const isEmail = (value: string): boolean => value.includes('@');

/**
 * Bulk "Create Class" from an Excel file (admin only). Subject, semester and lecturer are given by
 * their codes. A class whose code already exists, or that appears twice in the file, is skipped
 * instead of created, and `dryRun` lets the admin see all of that before anything is written.
 */
@Injectable()
export class ClassImportService {
  constructor(
    private readonly classRepo: ClassRepository,
    private readonly subjectRepo: SubjectRepository,
    private readonly semesterRepo: SemesterRepository,
    private readonly userFacade: UserFacade,
  ) {}

  async importClasses(dto: ImportClassesDto): Promise<ClassImportResult> {
    const dryRun = dto.dryRun ?? false;
    const rows = dto.rows.map(normalize);

    const lecturerValues = rows.map((row) => row.lecturer).filter(notNull);
    const lecturerCodes = unique(
      lecturerValues
        .filter((value) => !isEmail(value))
        .map((v) => v.toUpperCase()),
    );
    const lecturerEmails = unique(
      lecturerValues.filter(isEmail).map((v) => v.toLowerCase()),
    );
    const [subjects, semesters, byCode, byEmail, existingCodes] =
      await Promise.all([
        this.subjectRepo.findAll(),
        this.semesterRepo.findAll(),
        this.userFacade.findLecturersByCodes(lecturerCodes),
        this.userFacade.findLecturersByEmails(lecturerEmails),
        this.classRepo.findExistingCodes(
          unique(rows.map((row) => row.classCode).filter(notNull)),
        ),
      ]);

    const subjectIndex = new Map(
      subjects.map((s) => [s.subjectCode.toLowerCase(), s]),
    );
    const semesterIndex = new Map(
      semesters.map((s) => [s.semesterCode.toLowerCase(), s]),
    );
    const lecturerCodeIndex = new Map(
      byCode.map((l) => [l.lecturerCode.toUpperCase(), l]),
    );
    const lecturerEmailIndex = new Map(
      byEmail.map((l) => [l.email.toLowerCase(), l]),
    );

    const firstLineOfCode = new Map<string, number>();
    const toCreate: ValidRow[] = [];
    const results = rows.map((row): ClassImportRowResult => {
      const validation = this.validate(
        row,
        subjectIndex,
        semesterIndex,
        lecturerCodeIndex,
        lecturerEmailIndex,
      );
      if (!validation.ok) return this.result(row, 'error', validation.message);

      const { value } = validation;
      const key = value.classCode.toLowerCase();
      if (existingCodes.has(key)) {
        return this.result(
          row,
          'skipped',
          `Class code ${value.classCode} already exists`,
        );
      }
      const earlierLine = firstLineOfCode.get(key);
      if (earlierLine !== undefined) {
        return this.result(
          row,
          'skipped',
          `Duplicate of row ${earlierLine} in the file`,
        );
      }
      firstLineOfCode.set(key, row.line);
      toCreate.push(value);
      return this.result(row, 'created', null);
    });

    if (!dryRun && toCreate.length > 0) await this.save(toCreate);

    const count = (status: ClassImportRowStatus): number =>
      results.filter((result) => result.status === status).length;
    return {
      dryRun,
      total: results.length,
      created: count('created'),
      skipped: count('skipped'),
      failed: count('error'),
      rows: results,
    };
  }

  /** Required cells, length limits and the subject, semester and lecturer the row points at. */
  private validate(
    row: NormalizedRow,
    subjects: Map<string, Subject>,
    semesters: Map<string, Semester>,
    lecturersByCode: Map<string, LecturerSummary>,
    lecturersByEmail: Map<string, LecturerSummary>,
  ): Validation {
    const fail = (message: string): Validation => ({ ok: false, message });

    if (!row.classCode) return fail('Class code is required');
    if (row.classCode.length > MAX_CLASS_CODE_LENGTH) {
      return fail(
        `Class code is longer than ${MAX_CLASS_CODE_LENGTH} characters`,
      );
    }
    if (!row.name) return fail('Class name is required');
    if (row.name.length > MAX_CLASS_NAME_LENGTH) {
      return fail(
        `Class name is longer than ${MAX_CLASS_NAME_LENGTH} characters`,
      );
    }
    if (!row.subjectCode) return fail('Subject code is required');
    if (!row.semesterCode) return fail('Semester code is required');
    if (!row.lecturer) return fail('Lecturer code or email is required');

    const subject = subjects.get(row.subjectCode.toLowerCase());
    if (!subject) return fail(`No subject with code ${row.subjectCode}`);
    const semester = semesters.get(row.semesterCode.toLowerCase());
    if (!semester) return fail(`No semester with code ${row.semesterCode}`);

    const lecturer = isEmail(row.lecturer)
      ? lecturersByEmail.get(row.lecturer.toLowerCase())
      : lecturersByCode.get(row.lecturer.toUpperCase());
    if (!lecturer) {
      return fail(
        isEmail(row.lecturer)
          ? `No lecturer with email ${row.lecturer}`
          : `No lecturer with code ${row.lecturer}`,
      );
    }
    if (lecturer.assignmentBlockedReason) {
      return fail(lecturer.assignmentBlockedReason);
    }
    return {
      ok: true,
      value: {
        row,
        classCode: row.classCode,
        name: row.name,
        subject,
        semester,
        lecturer,
      },
    };
  }

  private async save(valid: ValidRow[]): Promise<void> {
    try {
      await this.classRepo.createMany(
        valid.map((item) => ({
          classCode: item.classCode,
          name: item.name,
          subjectId: item.subject.id,
          semesterId: item.semester.id,
          lecturerId: item.lecturer.userId,
        })),
      );
    } catch (error) {
      // Someone created one of these codes after the check above; nothing was inserted.
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          'A class code in this file was created by someone else in the meantime. Check the file again.',
        );
      }
      throw error;
    }
  }

  private result(
    row: NormalizedRow,
    status: ClassImportRowStatus,
    message: string | null,
  ): ClassImportRowResult {
    return {
      line: row.line,
      status,
      classCode: row.classCode,
      name: row.name,
      message,
    };
  }
}