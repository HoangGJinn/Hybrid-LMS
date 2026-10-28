import { ClassStudent } from '../entities/class-student.entity.js';

/** Public roster entry, safe to show to other students (no scores). */
export class ClassmateView {
  id: string;
  classId: string;
  studentCode: string;
  fullName: string;
  email: string;

  static fromEnrollment(enrollment: ClassStudent): ClassmateView {
    return {
      id: enrollment.studentId,
      classId: enrollment.classId,
      studentCode: enrollment.student?.studentCode ?? '',
      fullName: enrollment.student?.user?.fullName ?? '',
      email: enrollment.student?.user?.email ?? '',
    };
  }
}