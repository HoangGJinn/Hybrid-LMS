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
