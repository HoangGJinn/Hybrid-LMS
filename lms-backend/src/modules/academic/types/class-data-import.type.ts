import type { ClassImportRowResult } from './class-import.type.js';

export type EnrollmentImportRowStatus = 'added' | 'skipped' | 'error';

/** Outcome of one row of a "Students" sheet. */
export interface EnrollmentImportRowResult {
  /** Row number from the sheet. */
  line: number;
  /** `added` = will be / was added (depends on `dryRun`). */
  status: EnrollmentImportRowStatus;
  classCode: string | null;
  studentCode: string | null;
  fullName: string | null;
  message: string | null;
}

/** What happened to one uploaded file. */
export interface ClassDataImportFileResult {
  name: string;
  classes: ClassImportRowResult[];
  students: EnrollmentImportRowResult[];
  createdClasses: number;
  skippedClasses: number;
  failedClasses: number;
  addedStudents: number;
  skippedStudents: number;
  failedStudents: number;
}

export interface ClassDataImportResult {
  /** true = nothing was written: this is a preview. */
  dryRun: boolean;
  files: ClassDataImportFileResult[];
  /** Sums over all files. */
  createdClasses: number;
  skippedClasses: number;
  failedClasses: number;
  addedStudents: number;
  skippedStudents: number;
  failedStudents: number;
}