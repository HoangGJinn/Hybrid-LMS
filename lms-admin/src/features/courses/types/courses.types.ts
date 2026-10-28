// Mirrors the backend views (ClassView, SubjectView, SemesterView) and CreateClassDto.
// Declared locally for now; move to `@lms/types` once the shared package is wired up.

/** Row of GET /api/classes. Dates arrive as ISO strings. */
export interface ClassView {
  id: string;
  classCode: string;
  name: string;
  isActive: boolean;
  endedAt: string | null;
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  semesterId: string;
  semesterCode: string;
  semesterName: string;
  /** `user.id` of the lecturer. */
  lecturerId: string;
  lecturerName: string;
  studentCount?: number;
}

export interface SubjectView {
  id: string;
  subjectCode: string;
  name: string;
  description: string | null;
}

export interface SemesterView {
  id: string;
  semesterCode: string;
  name: string;
  startDate: string;
  endDate: string;
}

/** A lecturer as listed by GET /api/users?role=LECTURER (backend `UserView`, trimmed). */
export interface LecturerView {
  id: string;
  fullName: string;
  email: string;
}

/** Body of POST /api/classes. The backend rejects unknown properties, so send exactly these. */
export interface CreateClassPayload {
  classCode: string;
  name: string;
  subjectId: string;
  semesterId: string;
  lecturerId: string;
}

export type UpdateClassPayload = Partial<CreateClassPayload>;

/** The API only returns active classes by default; `all` is assembled from two requests. */
export type ClassStatusFilter = 'active' | 'ended' | 'all';

export interface ClassFilters {
  status: ClassStatusFilter;
  /** Empty string = every semester. */
  semesterId: string;
  /** Matches class code or name. */
  search: string;
}

/** A student enrolled in a class: row of GET /api/classes/:id/participants. */
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
  joinedAt: string;
}

/** A student offered by "Add Participant". */
export interface ParticipantCandidate {
  studentId: string;
  studentCode: string;
  fullName: string;
  email: string;
  /** true = already a participant: shown but not selectable. */
  alreadyInClass: boolean;
}

/** One data row of an import file, as sent to POST /api/classes/:id/participants/import. */
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

export interface ImportResult {
  /** true = preview only, nothing was written. */
  dryRun: boolean;
  total: number;
  added: number;
  skipped: number;
  failed: number;
  rows: ImportRowResult[];
}

