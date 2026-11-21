import { Injectable, NotFoundException } from '@nestjs/common';
import {
  safeFileName,
  type ExportedFile,
} from '../../../shared/excel/workbook.util.js';
import { UserFacade } from '../../user/facades/user.facade.js';
import type { Class } from '../entities/class.entity.js';
import { ClassRepository } from '../repositories/class.repository.js';
import {
  buildClassListWorkbook,
  type ClassListExportRow,
} from '../utils/class-list-export.builder.js';

/** Builds the Excel class list of one lecturer or one student, for the admin. */
@Injectable()
export class ClassExportService {
  constructor(
    private readonly classRepo: ClassRepository,
    private readonly userFacade: UserFacade,
  ) {}

  /** Every class the lecturer teaches, ended ones included. */
  async exportLecturerClasses(lecturerId: string): Promise<ExportedFile> {
    const [lecturer] = await this.userFacade.findLecturersByIds([lecturerId]);
    if (!lecturer) throw new NotFoundException('Lecturer not found');

    const classes = await this.classRepo.findAllByLecturerId(lecturerId);
    const counts = await this.classRepo.countStudentsBatch(
      classes.map((cls) => cls.id),
    );
    const rows = classes.map((cls) => this.toRow(cls, counts, null));
    return {
      fileName: `${safeFileName(`Classes-taught-${lecturer.lecturerCode}`)}.xlsx`,
      buffer: await buildClassListWorkbook('LECTURER', rows),
    };
  }

  /** Every class the student is enrolled in, ended ones included. */
  async exportStudentClasses(studentId: string): Promise<ExportedFile> {
    const [student] = await this.userFacade.findStudentsByIds([studentId]);
    if (!student) throw new NotFoundException('Student not found');

    const enrollments =
      await this.classRepo.findEnrollmentsByStudentId(studentId);
    const counts = await this.classRepo.countStudentsBatch(
      enrollments.map((enrollment) => enrollment.classId),
    );
    const rows = enrollments.map((enrollment) =>
      this.toRow(enrollment.class, counts, enrollment.joinedAt),
    );
    return {
      fileName: `${safeFileName(`Classes-enrolled-${student.studentCode}`)}.xlsx`,
      buffer: await buildClassListWorkbook('STUDENT', rows),
    };
  }

  private toRow(
    cls: Class,
    studentCounts: Map<string, number>,
    joinedAt: Date | null,
  ): ClassListExportRow {
    return {
      classCode: cls.classCode,
      name: cls.name,
      subjectCode: cls.subject?.subjectCode ?? '',
      subjectName: cls.subject?.name ?? '',
      semesterCode: cls.semester?.semesterCode ?? '',
      semesterName: cls.semester?.name ?? '',
      lecturerName: cls.lecturer?.user?.fullName ?? '',
      studentCount: studentCounts.get(cls.id) ?? 0,
      isActive: cls.isActive,
      endedAt: cls.endedAt ?? null,
      joinedAt,
    };
  }
}