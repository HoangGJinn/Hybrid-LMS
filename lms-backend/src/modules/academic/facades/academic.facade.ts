import { Injectable } from '@nestjs/common';
import { ClassService } from '../services/class.service.js';
import { ClassAccessPolicy } from '../policies/class-access.policy.js';
import { AuthenticatedUser } from '../../../common/types/authenticated-user.type.js';
import { SubjectService } from '../services/subject.service.js';
import { SemesterService } from '../services/semester.service.js';
import { ClassView } from '../types/class-view.type.js';
import { SubjectView } from '../types/subject-view.type.js';
import { SemesterView } from '../types/semester-view.type.js';
import { Role } from '../../../common/enums/role.enum.js';
import { PaginatedResult } from '../../../common/types/paginated-result.type.js';
import { QueryMyClassesDto } from '../dto/query-my-classes.dto.js';

/**
 * Facade pattern for inter-module communication.
 * Other modules (such as Content, Assessment, Attendance) MUST interact via AcademicFacade,
 * NOT via ClassService/SubjectService/SemesterService directly.
 * Only read-only projections (ClassView, SubjectView, SemesterView) are exposed — never raw entities.
 */
@Injectable()
export class AcademicFacade {
  constructor(
    private readonly classService: ClassService,
    private readonly subjectService: SubjectService,
    private readonly semesterService: SemesterService,
    private readonly classAccessPolicy: ClassAccessPolicy,
  ) {}

  /**
   * Throws 404 when the class does not exist and 403 unless the user is an admin,
   * the class lecturer, or a student enrolled in the class.
   */
  async assertCanViewClass(
    classId: string,
    user: AuthenticatedUser,
  ): Promise<void> {
    const cls = await this.classService.findById(classId);
    await this.classAccessPolicy.assertCanView(cls, user);
  }

  /** Throws 404 when the class does not exist and 403 unless the user is an admin or the class lecturer. */
  async assertCanManageClass(
    classId: string,
    user: AuthenticatedUser,
  ): Promise<void> {
    const cls = await this.classService.findById(classId);
    this.classAccessPolicy.assertCanManage(cls, user);
  }

  async getClassById(id: string): Promise<ClassView> {
    const cls = await this.classService.findById(id);
    const count = await this.classService.countStudents(id);
    return ClassView.fromEntity(cls, count);
  }

  async getClassesByLecturer(lecturerId: string): Promise<ClassView[]> {
    const classes = await this.classService.findByLecturer(lecturerId);
    const counts = await this.classService.countStudentsBatch(
      classes.map((c) => c.id),
    );
    return classes.map((c) => ClassView.fromEntity(c, counts.get(c.id) ?? 0));
  }

  async getClassesByStudent(studentId: string): Promise<ClassView[]> {
    const classes = await this.classService.findByStudent(studentId);
    const counts = await this.classService.countStudentsBatch(
      classes.map((c) => c.id),
    );
    return classes.map((c) => ClassView.fromEntity(c, counts.get(c.id) ?? 0));
  }

  async findMyClasses(
    userId: string,
    role: Role,
    query: QueryMyClassesDto,
  ): Promise<PaginatedResult<ClassView>> {
    return this.classService.findMyClasses(userId, role, query);
  }

  async findClasses(filter?: {
    isActive?: boolean;
    semesterId?: string;
    subjectId?: string;
  }): Promise<ClassView[]> {
    return this.classService.findAll(filter);
  }

  async countStudentsInClass(classId: string): Promise<number> {
    return this.classService.countStudents(classId);
  }

  async getSubjectById(id: string): Promise<SubjectView> {
    const subject = await this.subjectService.findById(id);
    return SubjectView.fromEntity(subject);
  }

  async getAllSubjects(): Promise<SubjectView[]> {
    const subjects = await this.subjectService.findAll();
    return subjects.map((s) => SubjectView.fromEntity(s));
  }

  async getSemesterById(id: string): Promise<SemesterView> {
    const semester = await this.semesterService.findById(id);
    return SemesterView.fromEntity(semester);
  }

  async getAllSemesters(): Promise<SemesterView[]> {
    const semesters = await this.semesterService.findAll();
    return semesters.map((s) => SemesterView.fromEntity(s));
  }

  async getActiveSemester(): Promise<SemesterView | null> {
    const semester = await this.semesterService.getActiveSemester();
    return semester ? SemesterView.fromEntity(semester) : null;
  }
}
