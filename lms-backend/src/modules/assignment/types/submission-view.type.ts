import type { FileDownloadView } from '../../../shared/file/types/file-download-view.type.js';
import type { AssignmentSubmission } from '../entities/assignment-submission.entity.js';

/** A student's submission with short-lived links to its files. */
export class SubmissionView {
  readonly id: string;
  /** Time of the latest edit (resubmitting updates it). */
  readonly submittedAt: Date;
  readonly score: number | null;
  readonly comment: string | null;
  readonly files: FileDownloadView[];

  private constructor(entity: AssignmentSubmission, files: FileDownloadView[]) {
    this.id = entity.id;
    this.submittedAt = entity.submittedAt;
    // `numeric` columns come back from Postgres as strings.
    this.score = entity.score === null ? null : Number(entity.score);
    this.comment = entity.comment;
    this.files = files;
  }

  static from(
    entity: AssignmentSubmission,
    files: FileDownloadView[],
  ): SubmissionView {
    return new SubmissionView(entity, files);
  }
}