import { Student } from '../entities/student.entity.js';
import { StudentStatus } from '../enums/student-status.enum.js';

/**
 * Read-only projection of a student (user + student profile) for other modules,
 * e.g. the academic module when it enrols students in a class.
 */
export class StudentSummary {
  /** `user.id`, which is also the primary key of the student profile. */
  userId: string;
  studentCode: string;
  fullName: string;
  email: string;
  isActive: boolean;
  /** StudentStatus value. */
  status: string;
  /** Why this student cannot join a class right now; null when they can. */
  enrollmentBlockedReason: string | null;

  /** `student.user` must be loaded. */
  static fromEntity(student: Student): StudentSummary {
    const summary = new StudentSummary();
    summary.userId = student.userId;
    summary.studentCode = student.studentCode;
    summary.fullName = student.user.fullName;
    summary.email = student.user.email;
    summary.isActive = student.user.isActive;
    summary.status = student.status;
    summary.enrollmentBlockedReason = this.getEnrollmentBlockedReason(student);
    return summary;
  }

  private static getEnrollmentBlockedReason(student: Student): string | null {
    if (!student.user.isActive) {
      return 'The student account is deactivated';
    }
    if (student.status !== StudentStatus.STUDYING) {
      return `The student is not currently studying (status: ${student.status})`;
    }
    return null;
  }
}
