import type { FileDownloadView } from '../../../shared/file/types/file-download-view.type.js';
import type { ExamSchedule } from '../entities/exam-schedule.entity.js';
import type { ExamFormat } from '../enums/exam-format.enum.js';
import type { ExamStatus } from '../enums/exam-status.enum.js';
import type { ExamQuestionView } from './exam-question-view.type.js';

interface ExamViewParts {
  readonly questions: readonly ExamQuestionView[];
  readonly file: FileDownloadView | null;
  readonly status: ExamStatus;
  readonly startedCount: number;
  readonly isContentLocked: boolean;
}

/** One exam as its lecturer sees it: correct answers and the question file's download link included. */
export class ExamView {
  readonly id: string;
  readonly classId: string;
  readonly examName: string;
  readonly startTime: Date;
  readonly endTime: Date;
  readonly durationMinutes: number;
  readonly format: ExamFormat;
  /** Empty for a FILE exam. */
  readonly questions: readonly ExamQuestionView[];
  /** The question file of a FILE exam; always null for a multiple-choice exam. */
  readonly file: FileDownloadView | null;
  /** Computed by the server at the time of the request. */
  readonly status: ExamStatus;
  /** How many students have started the exam. */
  readonly startedCount: number;
  /** True when questions, answers and the question file can no longer be changed. */
  readonly isContentLocked: boolean;

  private constructor(entity: ExamSchedule, parts: ExamViewParts) {
    this.id = entity.id;
    this.classId = entity.classId;
    this.examName = entity.examName;
    this.startTime = entity.startTime;
    this.endTime = entity.endTime;
    this.durationMinutes = entity.durationMinutes;
    this.format = entity.format;
    this.questions = parts.questions;
    this.file = parts.file;
    this.status = parts.status;
    this.startedCount = parts.startedCount;
    this.isContentLocked = parts.isContentLocked;
  }

  static from(entity: ExamSchedule, parts: ExamViewParts): ExamView {
    return new ExamView(entity, parts);
  }
}
