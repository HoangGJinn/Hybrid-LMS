import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import {
  AuditAction,
  AuditCategory,
  AuditEntityType,
  AuditFacade,
} from '../../../shared/audit/index.js';
import {
  safeFileName,
  type ExportedFile,
} from '../../../shared/excel/workbook.util.js';
import { UserFacade } from '../../user/facades/user.facade.js';
import type {
  ClassExportStatus,
  ExportClassRostersQueryDto,
} from '../dto/export-class-rosters.dto.js';
import { ClassRepository } from '../repositories/class.repository.js';
import { SemesterRepository } from '../repositories/semester.repository.js';
import { SubjectRepository } from '../repositories/subject.repository.js';
import {
  buildClassRosterWorkbook,
  type RosterClassRow,
  type RosterStudentRow,
} from '../utils/class-roster-export.builder.js';
import { buildReferenceCodesWorkbook } from '../utils/reference-codes-export.builder.js';
import { formatVnDate } from '../utils/vn-date.util.js';

/** Most classes one export may hold. */
export const MAX_EXPORT_CLASSES = 2000;
const AVAILABLE = 'Available';

const IS_ACTIVE_OF: Record<ClassExportStatus, boolean | undefined> = {
  active: true,
  ended: false,
  all: undefined,
};

/** Excel exports for the admin "Import / Export" page. Every successful export is audited. */
@Injectable()
export class AcademicExportService {
  constructor(
    private readonly classRepo: ClassRepository,
    private readonly subjectRepo: SubjectRepository,
    private readonly semesterRepo: SemesterRepository,
    private readonly userFacade: UserFacade,
    @Optional() private readonly auditFacade?: AuditFacade,
  ) {}

  /**
   * Classes and their students in the layout of the import template (sheets `Classes` and
   * `Students`), so the file can be imported back. Removed classes are never included.
   */
  async exportClassRosters(
    query: ExportClassRostersQueryDto,
  ): Promise<ExportedFile> {
    const status = query.status ?? 'all';
    const semester = query.semesterId
      ? await this.semesterRepo.findById(query.semesterId)
      : null;
    if (query.semesterId && !semester) {
      throw new NotFoundException('Semester not found');
    }
    const filter = {
      semesterId: query.semesterId,
      isActive: IS_ACTIVE_OF[status],
    };

    const total = await this.classRepo.countForExport(filter);
    if (total > MAX_EXPORT_CLASSES) {
      throw new BadRequestException(
        query.semesterId
          ? `More than ${MAX_EXPORT_CLASSES} classes match. Choose a single class status.`
          : `More than ${MAX_EXPORT_CLASSES} classes match. Choose a semester.`,
      );
    }

    const classes = await this.classRepo.findForExport(filter, MAX_EXPORT_CLASSES);
    const enrollments = await this.classRepo.findEnrollmentsByClassIds(
      classes.map((cls) => cls.id),
    );
    const codeById = new Map(classes.map((cls) => [cls.id, cls.classCode]));
    const countById = new Map<string, number>();
    const students: RosterStudentRow[] = [];
    for (const enrollment of enrollments) {
      countById.set(
        enrollment.classId,
        (countById.get(enrollment.classId) ?? 0) + 1,
      );
      students.push({
        classCode: codeById.get(enrollment.classId) ?? '',
        studentCode: enrollment.student.studentCode,
        email: enrollment.student.user.email,
        fullName: enrollment.student.user.fullName,
      });
    }
    const classCodeOrder = (a: RosterStudentRow, b: RosterStudentRow): number =>
      a.classCode.localeCompare(b.classCode) ||
      a.studentCode.localeCompare(b.studentCode);
    students.sort(classCodeOrder);

    const classRows: RosterClassRow[] = classes.map((cls) => ({
      classCode: cls.classCode,
      name: cls.name,
      subjectCode: cls.subject?.subjectCode ?? '',
      subjectName: cls.subject?.name ?? '',
      semesterCode: cls.semester?.semesterCode ?? '',
      semesterName: cls.semester?.name ?? '',
      lecturerCode: cls.lecturer?.lecturerCode ?? '',
      lecturerName: cls.lecturer?.user?.fullName ?? '',
      studentCount: countById.get(cls.id) ?? 0,
      isActive: cls.isActive,
    }));

    const buffer = await buildClassRosterWorkbook(classRows, students);
    const scope = semester ? semester.semesterCode : 'all-semesters';
    await this.auditFacade?.record({
      category: AuditCategory.ADMIN,
      action: AuditAction.CLASS_ROSTERS_EXPORTED,
      entityType: AuditEntityType.CLASS,
      entityId: semester?.id ?? null,
      entityLabel: `${classRows.length} classes`,
      summary: `Exported ${classRows.length} class(es) and ${students.length} student row(s) (${semester ? `semester ${semester.semesterCode}` : 'all semesters'}, ${status} classes)`,
      metadata: {
        semesterId: semester?.id ?? null,
        semesterCode: semester?.semesterCode ?? null,
        status,
        classes: classRows.length,
        studentRows: students.length,
      },
    });
    return {
      fileName: `${safeFileName(`Class-rosters-${scope}-${status}`)}.xlsx`,
      buffer,
    };
  }

  /** Subjects, semesters and lecturers with the codes the import templates ask for. */
  async exportReferenceCodes(): Promise<ExportedFile> {
    const [subjects, semesters, lecturers] = await Promise.all([
      this.subjectRepo.findAll(),
      this.semesterRepo.findAll(),
      this.userFacade.findAllLecturers(),
    ]);
    const buffer = await buildReferenceCodesWorkbook({
      subjects: subjects.map((s) => ({
        subjectCode: s.subjectCode,
        name: s.name,
        description: s.description ?? '',
      })),
      // Newest first, as everywhere else in the admin; dates are days in Vietnam time.
      semesters: semesters.map((s) => ({
        semesterCode: s.semesterCode,
        name: s.name,
        startDate: formatVnDate(s.startDate),
        endDate: formatVnDate(s.endDate),
      })),
      lecturers: lecturers.map((l) => ({
        lecturerCode: l.lecturerCode,
        fullName: l.fullName,
        email: l.email,
        availability: l.assignmentBlockedReason ?? AVAILABLE,
      })),
    });
    await this.auditFacade?.record({
      category: AuditCategory.ADMIN,
      action: AuditAction.REFERENCE_CODES_EXPORTED,
      entityType: AuditEntityType.REFERENCE_DATA,
      entityLabel: 'Reference codes',
      summary: `Exported reference codes: ${subjects.length} subject(s), ${semesters.length} semester(s), ${lecturers.length} lecturer(s)`,
      metadata: {
        subjects: subjects.length,
        semesters: semesters.length,
        lecturers: lecturers.length,
      },
    });
    return { fileName: 'Reference-codes.xlsx', buffer };
  }
}
