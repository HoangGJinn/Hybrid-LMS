export type LecturerTrendDays = 7 | 14 | 30;

export interface LecturerOverviewSummary {
  activeClassCount: number;
  endedClassCount: number;
  totalStudents: number;
  activeStudents7dCount: number;
  pendingGradingCount: number;
  pendingExamsCount: number;
  pendingAssignmentsCount: number;
  oldestPendingSubmittedAt: string | null;
  overdueGrading48hCount: number;
  submissionRatePercent: number;
  submittedCount: number;
  expectedSubmissionCount: number;
  upcoming7dCount: number;
  upcomingExams7dCount: number;
  upcomingAssignments7dCount: number;
  liveExamsCount: number;
}

export interface LecturerAttentionAssignmentItem {
  assignmentId: string;
  classId: string;
  classCode: string;
  title: string;
  endAt: string;
  submittedCount: number;
  studentCount: number;
}

export interface LecturerAttentionClassItem {
  id: string;
  classCode: string;
  name: string;
  studentCount: number;
  itemCount: number;
}

export interface LecturerAttentionOverview {
  overdueGrading48hCount: number;
  lowSubmissionAssignments: LecturerAttentionAssignmentItem[];
  lowSubmissionAssignmentsCount: number;
  unconfiguredClasses: LecturerAttentionClassItem[];
  unconfiguredClassesCount: number;
}

export interface LecturerSubmissionTrendPoint {
  date: string;
  submitted: number;
  graded: number;
}

export interface LecturerDashboardTrends {
  days: number;
  submissionsByDay: LecturerSubmissionTrendPoint[];
}

export interface LecturerUpcomingEventItem {
  id: string;
  kind: 'exam' | 'assignment';
  sourceId: string;
  classId: string;
  classCode: string;
  className: string;
  title: string;
  startAt: string;
  endAt: string;
  durationMinutes: number | null;
  isLive: boolean;
  submittedCount: number;
  studentCount: number;
}

export interface LecturerClassHealthItem {
  id: string;
  classCode: string;
  name: string;
  subjectCode: string;
  subjectName: string;
  semesterCode: string;
  studentCount: number;
  activeStudents7dCount: number;
  itemCount: number;
  completionRatePercent: number;
  submissionRatePercent: number;
  avgScore: number | null;
  pendingGradingCount: number;
}

export interface LecturerGradingQueueItem {
  queueId: string;
  kind: 'exam' | 'assignment';
  sourceId: string;
  classId: string;
  classCode: string;
  className: string;
  title: string;
  studentId: string;
  studentName: string;
  studentCode: string;
  submittedAt: string;
}

export type ScoreBucketLabel = '<5' | '5-6.5' | '6.5-8' | '8-9' | '9-10';

export interface ScoreDistributionBucket {
  bucket: ScoreBucketLabel;
  count: number;
}

export interface LecturerScoreDistribution {
  overall: ScoreDistributionBucket[];
  byClass: Record<string, ScoreDistributionBucket[]>;
}

export interface LecturerAtRiskStudentItem {
  studentId: string;
  studentCode: string;
  fullName: string;
  classId: string;
  classCode: string;
  className: string;
  missedAssignmentsCount: number;
  avgScore: number | null;
  lastSeenAt: string | null;
  daysInactive: number | null;
}

export interface LecturerDashboardOverview {
  summary: LecturerOverviewSummary;
  attention: LecturerAttentionOverview;
  trends: LecturerDashboardTrends;
  upcomingEvents: LecturerUpcomingEventItem[];
  classes: LecturerClassHealthItem[];
  gradingQueue: LecturerGradingQueueItem[];
  scoreDistribution: LecturerScoreDistribution;
  atRiskStudents: LecturerAtRiskStudentItem[];
}
