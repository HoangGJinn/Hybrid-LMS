import type { FileDownloadView } from '../../../shared/file/types/file-download-view.type.js';
import type { Assignment } from '../entities/assignment.entity.js';
import type { AssignmentStatus } from '../enums/assignment-status.enum.js';
import type { SubmissionView } from './submission-view.type.js';

interface AssignmentViewParts {
  readonly classId: string;
  readonly status: AssignmentStatus;
  readonly files: FileDownloadView[];
  readonly mySubmission: SubmissionView | null;
  readonly submissionCount: number;
}

/** One assignment as a class member sees it. */
export class AssignmentView {
  readonly id: string;
  readonly classId: string;
  readonly title: string;
  readonly instruction: string;
  readonly openAt: Date;
  readonly endAt: Date;
  /** Status for the viewing student; for staff it only reflects the schedule. */
  readonly status: AssignmentStatus;
  /** Files the lecturer attached to the brief. */
  readonly files: FileDownloadView[];
  /** The viewing student's own submission; always null for staff. */
  readonly mySubmission: SubmissionView | null;
  readonly submissionCount: number;

  private constructor(entity: Assignment, parts: AssignmentViewParts) {
    this.id = entity.id;
    this.classId = parts.classId;
    this.title = entity.title;
    this.instruction = entity.instruction;
    this.openAt = entity.openAt;
    this.endAt = entity.endAt;
    this.status = parts.status;
    this.files = parts.files;
    this.mySubmission = parts.mySubmission;
    this.submissionCount = parts.submissionCount;
  }

  static from(entity: Assignment, parts: AssignmentViewParts): AssignmentView {
    return new AssignmentView(entity, parts);
  }
}