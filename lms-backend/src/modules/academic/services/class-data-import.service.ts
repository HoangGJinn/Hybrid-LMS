import {
  BadRequestException,
  ConflictException,
  Injectable,
  Optional,
} from '@nestjs/common';
import {
  AuditAction,
  AuditCategory,
  AuditEntityType,
  AuditFacade,
} from '../../../shared/audit/index.js';
import { isUniqueViolation } from '../../../common/utils/pg-error.util.js';
import { emptyToNull } from '../../../common/utils/string.util.js';
import { UserFacade } from '../../user/facades/user.facade.js';
import type { StudentSummary } from '../../user/types/student-summary.type.js';
import {
  ImportClassDataDto,
  ImportClassFileDto,
  ImportEnrollmentRowDto,
  MAX_IMPORT_STUDENT_ROWS,
} from '../dto/import-class-data.dto.js';
import { MAX_IMPORT_ROWS } from '../dto/import-participants.dto.js';
import { ClassRepository } from '../repositories/class.repository.js';
import type {
  ClassDataImportFileResult,
  ClassDataImportResult,
  EnrollmentImportRowResult,
  EnrollmentImportRowStatus,
} from '../types/class-data-import.type.js';
import type { ClassImportRowResult } from '../types/class-import.type.js';
import {
  ClassImportService,
  type PlannedClassRow,
  type ValidClassRow,
} from './class-import.service.js';

/** A class of the import and the students collected for it so far. */
interface ClassTarget {
  readonly planned: PlannedClassRow;
  readonly studentIds: string[];
  readonly seenStudentIds: Set<string>;
}

const unique = <T>(values: T[]): T[] => [...new Set(values)];
const notNull = <T>(value: T | null): value is T => value !== null;

/**
 * Bulk "Create class + add students" from several roster files at once (admin only). Each file
 * defines its classes and lists the students of those classes. A class is created only if its code
 * is new, and a student is added only to a class created by this import, so nothing already in the
 * system is touched. `dryRun` reports everything first; the real run is a single transaction.
 */
@Injectable()
export class ClassDataImportService {
  constructor(
    private readonly classImport: ClassImportService,
    private readonly classRepo: ClassRepository,
    private readonly userFacade: UserFacade,
    @Optional() private readonly auditFacade?: AuditFacade,
  ) {}

  async importData(dto: ImportClassDataDto): Promise<ClassDataImportResult> {
    const dryRun = dto.dryRun ?? false;
    this.assertWithinLimits(dto.files);

    // Classes of all files go through one plan so a code repeated across files is caught too.
    const entries = dto.files.flatMap((file, fileIndex) =>
      file.classes.map((row) => ({ fileIndex, row })),
    );
    const planned = await this.classImport.plan(
      entries.map((entry, index) => ({ ...entry.row, line: index + 1 })),
      (line) => {
        const entry = entries[line - 1];
        return `row ${entry.row.line} of ${dto.files[entry.fileIndex].name}`;
      },
    );
    const rowTargets = planned.map((item): ClassTarget => ({
      planned: item,
      studentIds: [],
      seenStudentIds: new Set(),
    }));
    const index = this.indexTargets(entries, rowTargets, dto.files.length);

    const students = await this.findStudents(dto.files);
    const fileResults = dto.files.map((file, fileIndex) =>
      this.buildFileResult(
        file,
        planned.filter((_item, i) => entries[i].fileIndex === fileIndex),
        // A file with one class lets its student rows leave the class code out.
        file.classes.length === 1
          ? (file.classes[0].classCode?.trim() ?? null)
          : null,
        { file: index.perFile[fileIndex], all: index.all },
        students,
      ),
    );

    if (!dryRun) await this.save(rowTargets);
    const result = this.summarize(dryRun, fileResults);
    if (!dryRun && (result.createdClasses > 0 || result.addedStudents > 0)) {
      await this.auditFacade?.record({
        category: AuditCategory.ADMIN,
        action: AuditAction.CLASS_IMPORTED,
        entityType: AuditEntityType.CLASS,
        entityLabel: `${result.createdClasses} courses, ${result.addedStudents} students`,
        summary: `Imported ${result.createdClasses} course(s) and ${result.addedStudents} student(s) from ${dto.files.length} file(s)`,
        metadata: {
          files: dto.files.map((f) => f.name),
          createdClasses: result.createdClasses,
          addedStudents: result.addedStudents,
          skippedClasses: result.skippedClasses,
          failedClasses: result.failedClasses,
          skippedStudents: result.skippedStudents,
          failedStudents: result.failedStudents,
        },
      });
    }
    return result;
  }

  /**
   * Finds the class a student row points at. A student row belongs to the class of its own file
   * when the file defines that code; only a code defined in no other place of the file falls back
   * to the class of another file. Among rows with the same code the one that creates the class wins.
   */
  private indexTargets(
    entries: ReadonlyArray<{ fileIndex: number; row: { classCode?: string } }>,
    rowTargets: readonly ClassTarget[],
    fileCount: number,
  ): { perFile: Map<string, ClassTarget>[]; all: Map<string, ClassTarget> } {
    const perFile = Array.from(
      { length: fileCount },
      () => new Map<string, ClassTarget>(),
    );
    const all = new Map<string, ClassTarget>();
    const prefer = (
      map: Map<string, ClassTarget>,
      code: string,
      target: ClassTarget,
    ): void => {
      const existing = map.get(code);
      if (!existing || (!existing.planned.valid && target.planned.valid)) {
        map.set(code, target);
      }
    };
    entries.forEach((entry, i) => {
      const code = entry.row.classCode?.trim().toLowerCase();
      if (!code) return;
      prefer(perFile[entry.fileIndex], code, rowTargets[i]);
      prefer(all, code, rowTargets[i]);
    });
    return { perFile, all };
  }

  private assertWithinLimits(files: readonly ImportClassFileDto[]): void {
    const classCount = files.reduce((sum, f) => sum + f.classes.length, 0);
    const studentCount = files.reduce((sum, f) => sum + f.students.length, 0);
    if (classCount > MAX_IMPORT_ROWS) {
      throw new BadRequestException(
        `An import can contain at most ${MAX_IMPORT_ROWS} classes`,
      );
    }
    if (studentCount > MAX_IMPORT_STUDENT_ROWS) {
      throw new BadRequestException(
        `An import can contain at most ${MAX_IMPORT_STUDENT_ROWS} student rows`,
      );
    }
  }

  /** Looks every student of every file up in two queries. */
  private async findStudents(files: readonly ImportClassFileDto[]): Promise<{
    byCode: Map<string, StudentSummary>;
    byEmail: Map<string, StudentSummary>;
  }> {
    const rows = files.flatMap((file) => file.students);
    const codes = unique(
      rows
        .map((row) => emptyToNull(row.studentCode)?.toUpperCase() ?? null)
        .filter(notNull),
    );
    const emails = unique(
      rows
        .map((row) => emptyToNull(row.email)?.toLowerCase() ?? null)
        .filter(notNull),
    );
    const [byCode, byEmail] = await Promise.all([
      this.userFacade.findStudentsByCodes(codes),
      this.userFacade.findStudentsByEmails(emails),
    ]);
    return {
      byCode: new Map(byCode.map((s) => [s.studentCode.toUpperCase(), s])),
      byEmail: new Map(byEmail.map((s) => [s.email.toLowerCase(), s])),
    };
  }

  private buildFileResult(
    file: ImportClassFileDto,
    plannedClasses: PlannedClassRow[],
    defaultCode: string | null,
    targets: {
      file: Map<string, ClassTarget>;
      all: Map<string, ClassTarget>;
    },
    students: {
      byCode: Map<string, StudentSummary>;
      byEmail: Map<string, StudentSummary>;
    },
  ): ClassDataImportFileResult {
    const classes: ClassImportRowResult[] = plannedClasses.map(
      (item, index) => ({
        ...item.result,
        line: file.classes[index].line,
      }),
    );
    const studentResults = file.students.map((row) =>
      this.placeStudent(row, defaultCode, targets, students),
    );

    const countClasses = (status: ClassImportRowResult['status']): number =>
      classes.filter((c) => c.status === status).length;
    const countStudents = (status: EnrollmentImportRowStatus): number =>
      studentResults.filter((s) => s.status === status).length;
    return {
      name: file.name,
      classes,
      students: studentResults,
      createdClasses: countClasses('created'),
      skippedClasses: countClasses('skipped'),
      failedClasses: countClasses('error'),
      addedStudents: countStudents('added'),
      skippedStudents: countStudents('skipped'),
      failedStudents: countStudents('error'),
    };
  }

  /** Decides what one student row does, and remembers the student on the class when it is added. */
  private placeStudent(
    row: ImportEnrollmentRowDto,
    defaultClassCode: string | null,
    targets: {
      file: Map<string, ClassTarget>;
      all: Map<string, ClassTarget>;
    },
    students: {
      byCode: Map<string, StudentSummary>;
      byEmail: Map<string, StudentSummary>;
    },
  ): EnrollmentImportRowResult {
    const classCode = emptyToNull(row.classCode) ?? defaultClassCode;
    const code = emptyToNull(row.studentCode)?.toUpperCase() ?? null;
    const email = emptyToNull(row.email)?.toLowerCase() ?? null;
    const result = (
      status: EnrollmentImportRowStatus,
      message: string | null,
      student?: StudentSummary,
    ): EnrollmentImportRowResult => ({
      line: row.line,
      status,
      classCode,
      studentCode: student?.studentCode ?? code,
      fullName: student?.fullName ?? null,
      message,
    });

    if (!classCode) {
      return result(
        'error',
        'Class code is required because the file has more than one class',
      );
    }
    const key = classCode.toLowerCase();
    const target = targets.file.get(key) ?? targets.all.get(key);
    if (!target) {
      return result('error', `Class ${classCode} is not in the imported files`);
    }

    const resolved = this.resolveStudent(code, email, students);
    if (!resolved.ok)
      return result('error', resolved.message, resolved.student);
    const { student } = resolved;

    if (target.planned.result.status !== 'created') {
      return result(
        'skipped',
        `Class ${classCode} is not created: ${target.planned.result.message ?? 'it has an error'}`,
        student,
      );
    }
    if (target.seenStudentIds.has(student.userId)) {
      return result(
        'skipped',
        'Duplicate of an earlier row for this class',
        student,
      );
    }
    target.seenStudentIds.add(student.userId);
    target.studentIds.push(student.userId);
    return result('added', null, student);
  }

  private resolveStudent(
    code: string | null,
    email: string | null,
    students: {
      byCode: Map<string, StudentSummary>;
      byEmail: Map<string, StudentSummary>;
    },
  ):
    | { ok: true; student: StudentSummary }
    | { ok: false; message: string; student?: StudentSummary } {
    let student: StudentSummary | undefined;
    if (code) {
      student = students.byCode.get(code);
      if (!student)
        return { ok: false, message: `No student with code ${code}` };
      if (email && student.email.toLowerCase() !== email) {
        return {
          ok: false,
          message:
            'The student code and the email belong to different students',
          student,
        };
      }
    } else if (email) {
      student = students.byEmail.get(email);
      if (!student)
        return { ok: false, message: `No student with email ${email}` };
    } else {
      return { ok: false, message: 'Provide a student code or an email' };
    }
    if (student.enrollmentBlockedReason) {
      return { ok: false, message: student.enrollmentBlockedReason, student };
    }
    return { ok: true, student };
  }

  private async save(rowTargets: readonly ClassTarget[]): Promise<void> {
    const entries = rowTargets.flatMap((target) => {
      const valid: ValidClassRow | null = target.planned.valid;
      if (!valid) return [];
      return [
        {
          data: {
            classCode: valid.classCode,
            name: valid.name,
            subjectId: valid.subject.id,
            semesterId: valid.semester.id,
            lecturerId: valid.lecturer.userId,
          },
          studentIds: target.studentIds,
        },
      ];
    });
    if (entries.length === 0) return;
    try {
      await this.classRepo.createWithStudents(entries);
    } catch (error) {
      // Someone created one of these codes after the check; nothing was inserted.
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          'A class code in these files was created by someone else in the meantime. Check the files again.',
        );
      }
      throw error;
    }
  }

  private summarize(
    dryRun: boolean,
    files: ClassDataImportFileResult[],
  ): ClassDataImportResult {
    const sum = (pick: (file: ClassDataImportFileResult) => number): number =>
      files.reduce((total, file) => total + pick(file), 0);
    return {
      dryRun,
      files,
      createdClasses: sum((f) => f.createdClasses),
      skippedClasses: sum((f) => f.skippedClasses),
      failedClasses: sum((f) => f.failedClasses),
      addedStudents: sum((f) => f.addedStudents),
      skippedStudents: sum((f) => f.skippedStudents),
      failedStudents: sum((f) => f.failedStudents),
    };
  }
}