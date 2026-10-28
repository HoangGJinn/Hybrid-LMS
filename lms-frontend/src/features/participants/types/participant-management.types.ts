/** A student enrolled in a class, as returned by `GET /api/classes/:id/participants`. Same shape as the admin app. */
export interface ParticipantView {
  /** `user.id` of the student. */
  studentId: string;
  studentCode: string;
  fullName: string;
  email: string;
  /** StudentStatus, e.g. STUDYING. */
  status: string;
  /** false = the account was deactivated after the student joined. */
  isActive: boolean;
  /** ISO date string. */
  joinedAt: string;
}

/** A student offered by "Add participants". */
export interface ParticipantCandidate {
  /** `user.id` of the student. */
  studentId: string;
  studentCode: string;
  fullName: string;
  email: string;
  /** true = already in the class: shown but not selectable. */
  alreadyInClass: boolean;
}

/** Result of `POST /api/classes/:id/participants/bulk`. */
export interface AddParticipantsResult {
  added: number;
  skipped: number;
}

/** One student of an import file. Identified by `studentCode` and/or `email`. Same shape as the admin app. */
export interface ImportRowPayload {
  /** Row number in the file (the header is row 1). */
  line: number;
  studentCode?: string;
  email?: string;
}

export type ImportRowStatus = 'added' | 'skipped' | 'error';

export interface ImportRowResult {
  line: number;
  /** `added` = will be added (preview) / was added (import). */
  status: ImportRowStatus;
  studentCode: string | null;
  fullName: string | null;
  message: string | null;
}

/** Result of `POST /api/classes/:id/participants/import`. */
export interface ImportResult {
  /** true = preview only, nothing was written. */
  dryRun: boolean;
  total: number;
  added: number;
  skipped: number;
  failed: number;
  rows: ImportRowResult[];
}
