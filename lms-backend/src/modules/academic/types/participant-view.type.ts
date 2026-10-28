import { ClassStudent } from '../entities/class-student.entity.js';

/** A student enrolled in a class, as listed on the "Manage Participants" screen. */
export class ParticipantView {
  /** `user.id` of the student. */
  studentId: string;
  studentCode: string;
  fullName: string;
  email: string;
  /** StudentStatus value. */
  status: string;
  /** false = the student's account has been deactivated since they joined. */
  isActive: boolean;
  joinedAt: Date;

  /** `classStudent.student.user` must be loaded. */
  static fromEntity(classStudent: ClassStudent): ParticipantView {
    const { student } = classStudent;
    return {
      studentId: classStudent.studentId,
      studentCode: student.studentCode,
      fullName: student.user.fullName,
      email: student.user.email,
      status: student.status,
      isActive: student.user.isActive,
      joinedAt: classStudent.joinedAt,
    };
  }
}

/** A student the admin / lecturer can pick in the "Add Participant" dialog. */
export interface ParticipantCandidateView {
  studentId: string;
  studentCode: string;
  fullName: string;
  email: string;
  /** true = already a participant; shown but not selectable. */
  alreadyInClass: boolean;
}

export type ParticipantImportRowStatus = 'added' | 'skipped' | 'error';

/** Outcome of one data row of an import file. */
export interface ParticipantImportRowResult {
  /** Row number from the file, as sent by the client. */
  line: number;
  /** `added` = will be / was added (depends on `dryRun`), `skipped` = nothing to do, `error` = cannot be added. */
  status: ParticipantImportRowStatus;
  studentCode: string | null;
  fullName: string | null;
  message: string | null;
}

export interface ParticipantImportResult {
  /** true = nothing was written: this is a preview of what the import would do. */
  dryRun: boolean;
  total: number;
  added: number;
  skipped: number;
  failed: number;
  rows: ParticipantImportRowResult[];
}