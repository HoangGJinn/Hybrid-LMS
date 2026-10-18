export type AssignmentStatus =
  'UPCOMING' | 'OPEN' | 'SUBMITTED' | 'GRADED' | 'OVERDUE';

export interface Assignment {
  id: string;
  classId: string;
  title: string;
  instruction: string;
  openAt: string;
  endAt: string;
  status: AssignmentStatus;
}

export interface AssignmentSubmission {
  id: string;
  assignmentId: string;
  submittedBy: string;
  studentName: string;
  score: number | null;
  comment: string | null;
  submittedAt: string;
  fileNames: string[];
}
