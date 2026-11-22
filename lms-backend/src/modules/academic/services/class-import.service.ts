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
export interface ValidClassRow {
  readonly row: NormalizedRow;
  readonly classCode: string;
  readonly name: string;
  readonly subject: Subject;
  readonly semester: Semester;
  readonly lecturer: LecturerSummary;
}

/** What an import row turns into: its result, plus the class to create when the result is `created`. */
export interface PlannedClassRow {
  readonly result: ClassImportRowResult;
  readonly valid: ValidClassRow | null;
}

type Validation =
  | { readonly ok: true; readonly value: ValidClassRow }
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
    const planned = await this.plan(
      dto.rows,
      (line) => `row ${line} in the file`,
    );
    const results = planned.map((item) => item.result);
    const toCreate = planned.flatMap((item) =>
      item.valid ? [item.valid] : [],
    );

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

  /**
   * Decides, for every row, whether its class would be created, skipped as a duplicate (code already
   * used, or repeated by an earlier row) or rejected. Nothing is written. `line` must be unique per
   * row, and `locate` turns the line of an earlier row into words for the "duplicate of" message.
   * The result is in the order of `rows`.
   */
  async plan(
    rows: readonly ImportClassRowDto[],
    locate: (line: number) => string,
  ): Promise<PlannedClassRow[]> {
    const normalized = rows.map(normalize);

    const lecturerValues = normalized
      .map((row) => row.lecturer)
      .filter(notNull);
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
          unique(normalized.map((row) => row.classCode).filter(notNull)),
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
    return normalized.map((row): PlannedClassRow => {
      const reject = (
        status: ClassImportRowStatus,
        message: string,
      ): PlannedClassRow => ({
        result: this.result(row, status, message),
        valid: null,
      });
      const validation = this.validate(
        row,
        subjectIndex,
        semesterIndex,
        lecturerCodeIndex,
        lecturerEmailIndex,
      );
      if (!validation.ok) return reject('error', validation.message);

      const { value } = validation;
      const key = value.classCode.toLowerCase();
      if (existingCodes.has(key)) {
        return reject(
          'skipped',
          `Class code ${value.classCode} already exists`,
        );
      }
      const earlierLine = firstLineOfCode.get(key);
      if (earlierLine !== undefined) {
        return reject('skipped', `Duplicate of ${locate(earlierLine)}`);
      }
      firstLineOfCode.set(key, row.line);
      return { result: this.result(row, 'created', null), valid: value };
    });
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

  private async save(valid: ValidClassRow[]): Promise<void> {
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