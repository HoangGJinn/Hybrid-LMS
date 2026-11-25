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
  async getLecturerClasses(lecturerId: string): Promise<ClassListExportRow[]> {
    const [lecturer] = await this.userFacade.findLecturersByIds([lecturerId]);
    if (!lecturer) throw new NotFoundException('Lecturer not found');

    const classes = await this.classRepo.findAllByLecturerId(lecturerId);
    const counts = await this.classRepo.countStudentsBatch(
      classes.map((cls) => cls.id),
    );
    return classes.map((cls) => this.toRow(cls, counts, null));
  }

  /** Every class the student is enrolled in, ended ones included. */
  async getStudentClasses(studentId: string): Promise<ClassListExportRow[]> {
    const [student] = await this.userFacade.findStudentsByIds([studentId]);
    if (!student) throw new NotFoundException('Student not found');

    const enrollments =
      await this.classRepo.findEnrollmentsByStudentId(studentId);
    const counts = await this.classRepo.countStudentsBatch(
      enrollments.map((enrollment) => enrollment.classId),
    );
    return enrollments.map((enrollment) =>
      this.toRow(enrollment.class, counts, enrollment.joinedAt),
    );
  }

  /** Every class the lecturer teaches, ended ones included. */
  async exportLecturerClasses(lecturerId: string): Promise<ExportedFile> {
    const [lecturer] = await this.userFacade.findLecturersByIds([lecturerId]);
    if (!lecturer) throw new NotFoundException('Lecturer not found');

    const rows = await this.getLecturerClasses(lecturerId);
    const baseName = safeFileName(`Classes-taught-${lecturer.lecturerCode}`);
    return {
      fileName: `${baseName}.xlsx`,
      buffer: await buildClassListWorkbook('LECTURER', rows),
    };
  }

  /** Every class the student is enrolled in, ended ones included. */
  async exportStudentClasses(studentId: string): Promise<ExportedFile> {
    const [student] = await this.userFacade.findStudentsByIds([studentId]);
    if (!student) throw new NotFoundException('Student not found');

    const rows = await this.getStudentClasses(studentId);
    const baseName = safeFileName(`Classes-enrolled-${student.studentCode}`);
    return {
      fileName: `${baseName}.xlsx`,
      buffer: await buildClassListWorkbook('STUDENT', rows),
    };
  }

  private toRow(
    cls: Class,
    studentCounts: Map<string, number>,
    joinedAt: Date | null,
  ): ClassListExportRow {
    return {
      id: cls.id,
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