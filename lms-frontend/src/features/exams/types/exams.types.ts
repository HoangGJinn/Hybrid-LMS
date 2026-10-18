export type ExamSessionStatus = 'IN_PROGRESS' | 'SUBMITTED' | 'GRADED';

export interface ExamSchedule {
  id: string;
  classId: string;
  examName: string;
  startTime: string;
  endTime: string;
}

export interface ExamSession {
  id: string;
  examScheduleId: string;
  studentId: string;
  status: ExamSessionStatus;
  score: number | null;
  startedAt: string;
  endedAt: string | null;
}
