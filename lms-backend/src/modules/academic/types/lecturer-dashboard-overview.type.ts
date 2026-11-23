export interface LecturerOverviewSummary {
  readonly activeClassCount: number;
  readonly endedClassCount: number;
  readonly totalStudents: number;
  readonly activeStudents7dCount: number;
  readonly pendingGradingCount: number;
  readonly pendingExamsCount: number;
  readonly pendingAssignmentsCount: number;
  readonly oldestPendingSubmittedAt: Date | null;
  readonly overdueGrading48hCount: number;
  readonly submissionRatePercent: number;
  readonly submittedCount: number;
  readonly expectedSubmissionCount: number;
  readonly upcoming7dCount: number;
  readonly upcomingExams7dCount: number;
  readonly upcomingAssignments7dCount: number;
  readonly liveExamsCount: number;
}

export interface LecturerAttentionAssignmentItem {
  readonly assignmentId: string;
  readonly classId: string;
  readonly classCode: string;
  readonly title: string;
  readonly endAt: Date;
  readonly submittedCount: number;
  readonly studentCount: number;
}

export interface LecturerAttentionClassItem {
  readonly id: string;
  readonly classCode: string;
  readonly name: string;
  readonly studentCount: number;
  readonly itemCount: number;
}

export interface LecturerAttentionOverview {
  readonly overdueGrading48hCount: number;
  readonly lowSubmissionAssignments: LecturerAttentionAssignmentItem[];
  readonly lowSubmissionAssignmentsCount: number;
  readonly unconfiguredClasses: LecturerAttentionClassItem[];
  readonly unconfiguredClassesCount: number;
}

export interface LecturerSubmissionTrendPoint {
  /** Calendar day in Asia/Ho_Chi_Minh, formatted YYYY-MM-DD. */
  readonly date: string;
  readonly submitted: number;
  readonly graded: number;
}

export interface LecturerDashboardTrends {
  readonly days: number;
  readonly submissionsByDay: LecturerSubmissionTrendPoint[];
}

export interface LecturerUpcomingEventItem {
  readonly id: string;
  readonly kind: 'exam' | 'assignment';
  readonly sourceId: string;
  readonly classId: string;
  readonly classCode: string;
  readonly className: string;
  readonly title: string;
  readonly startAt: Date;
  readonly endAt: Date;
  readonly durationMinutes: number | null;
  readonly isLive: boolean;
  readonly submittedCount: number;
  readonly studentCount: number;
}

export interface LecturerClassHealthItem {
  readonly id: string;
  readonly classCode: string;
  readonly name: string;
  readonly subjectCode: string;
  readonly subjectName: string;
  readonly semesterCode: string;
  readonly studentCount: number;
  readonly activeStudents7dCount: number;
  readonly itemCount: number;
  readonly completionRatePercent: number;
  readonly submissionRatePercent: number;
  readonly avgScore: number | null;
  readonly pendingGradingCount: number;
}

export interface LecturerGradingQueueItem {
  readonly queueId: string;
  readonly kind: 'exam' | 'assignment';
  readonly sourceId: string;
  readonly classId: string;
  readonly classCode: string;
  readonly className: string;
  readonly title: string;
  readonly studentId: string;
  readonly studentName: string;
  readonly studentCode: string;
  readonly submittedAt: Date;
}

export type ScoreBucketLabel = '<5' | '5-6.5' | '6.5-8' | '8-9' | '9-10';

export interface ScoreDistributionBucket {
  readonly bucket: ScoreBucketLabel;
  readonly count: number;
}

export interface LecturerScoreDistribution {
  readonly overall: ScoreDistributionBucket[];
  readonly byClass: Record<string, ScoreDistributionBucket[]>;
}

export interface LecturerAtRiskStudentItem {
  readonly studentId: string;
  readonly studentCode: string;
  readonly fullName: string;
  readonly classId: string;
  readonly classCode: string;
  readonly className: string;
  readonly missedAssignmentsCount: number;
  readonly avgScore: number | null;
  readonly lastSeenAt: Date | null;
  readonly daysInactive: number | null;
}

export interface LecturerDashboardOverview {
  readonly summary: LecturerOverviewSummary;
  readonly attention: LecturerAttentionOverview;
  readonly trends: LecturerDashboardTrends;
  readonly upcomingEvents: LecturerUpcomingEventItem[];
  readonly classes: LecturerClassHealthItem[];
  readonly gradingQueue: LecturerGradingQueueItem[];
  readonly scoreDistribution: LecturerScoreDistribution;
  readonly atRiskStudents: LecturerAtRiskStudentItem[];
}
