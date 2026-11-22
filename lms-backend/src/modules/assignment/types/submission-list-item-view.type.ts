import type { FileDownloadView } from '../../../shared/file/types/file-download-view.type.js';
import type { AssignmentSubmission } from '../entities/assignment-submission.entity.js';

/** One submission as the lecturer (or the student's own list) sees it. `student.user` must be loaded. */
export class SubmissionListItemView {
  readonly id: string;
  readonly assignmentId: string;
  /** Id of the student who submitted. */
  readonly submittedBy: string;
  readonly studentName: string;
  readonly studentCode: string;
  readonly submittedAt: Date;
  readonly gradedAt: Date | null;
  readonly score: number | null;
  readonly comment: string | null;
  /** The answer typed online; null for file submissions. */
  readonly answerText: string | null;
  /** Files with short-lived download links. */
  readonly files: FileDownloadView[];
  /** Just the names, for screens that only list them. */
  readonly fileNames: string[];

  private constructor(
    entity: AssignmentSubmission,
    files: FileDownloadView[],
  ) {
    this.id = entity.id;
    this.assignmentId = entity.assignmentId;
    this.submittedBy = entity.submittedBy;
    this.studentName = entity.student.user.fullName;
    this.studentCode = entity.student.studentCode;
    this.submittedAt = entity.submittedAt;
    this.gradedAt = entity.gradedAt;
    // `numeric` columns come back from Postgres as strings.
    this.score = entity.score === null ? null : Number(entity.score);
    this.comment = entity.comment;
    this.answerText = entity.answerText;
    this.files = files;
    this.fileNames = files.map((file) => file.fileName);
  }

  static from(
    entity: AssignmentSubmission,
    files: FileDownloadView[],
  ): SubmissionListItemView {
    return new SubmissionListItemView(entity, files);
  }
}