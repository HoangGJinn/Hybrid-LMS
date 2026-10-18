export interface Classmate {
  id: string;
  classId: string;
  studentCode: string;
  fullName: string;
  email: string;
}

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
