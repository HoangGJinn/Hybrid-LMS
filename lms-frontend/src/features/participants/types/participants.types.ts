export interface Classmate {
  id: string;
  classId: string;
  studentCode: string;
  fullName: string;
  email: string;
}

/** A row of `/lecturer/students`. The score fields are placeholders until the mastery module exists. */
export interface RosterStudent {
  id: string;
  classId: string;
  studentCode: string;
  fullName: string;
  email: string;
  avgScore: number | null;
  avgMastery: number;
  submissionsDone: number;
  submissionsTotal: number;
  atRisk: boolean;
}
