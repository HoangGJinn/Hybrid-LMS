import { Lecturer } from '../entities/lecturer.entity.js';
import { LecturerStatus } from '../enums/lecturer-status.enum.js';

/**
 * Read-only projection of a lecturer (user + lecturer profile) for other modules,
 * e.g. the academic module when it assigns a lecturer to a class.
 */
export class LecturerSummary {
  /** `user.id`, which is also the primary key of the lecturer profile. */
  userId: string;
  lecturerCode: string;
  fullName: string;
  email: string;
  /** Why this lecturer cannot be given a class right now; null when they can. */
  assignmentBlockedReason: string | null;

  /** `lecturer.user` must be loaded. */
  static fromEntity(lecturer: Lecturer): LecturerSummary {
    const summary = new LecturerSummary();
    summary.userId = lecturer.userId;
    summary.lecturerCode = lecturer.lecturerCode;
    summary.fullName = lecturer.user.fullName;
    summary.email = lecturer.user.email;
    summary.assignmentBlockedReason = this.getAssignmentBlockedReason(lecturer);
    return summary;
  }

  private static getAssignmentBlockedReason(lecturer: Lecturer): string | null {
    if (!lecturer.user.isActive) {
      return 'The lecturer account is deactivated';
    }
    if (lecturer.status !== LecturerStatus.WORKING) {
      return `The lecturer is not currently working (status: ${lecturer.status})`;
    }
    return null;
  }
}