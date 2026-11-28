export type StudentDashboardDays = 7 | 14 | 30;

export type StudentAttentionSeverity = 'critical' | 'warning' | 'ok';

export type StudentAttentionKey =
  | 'exams_schedule'
  | 'assignment_deadlines'
  | 'knowledge_review';

export interface StudentAttentionClassRef {
  readonly id: string;
  readonly code: string;
  readonly name: string;
}

export interface StudentAttentionItem {
  readonly key: StudentAttentionKey;
  readonly label: string;
  readonly severity: StudentAttentionSeverity;
  readonly title: string;
  readonly detail?: string;
  readonly count: number;
  readonly classes?: StudentAttentionClassRef[];
  readonly link: string;
  readonly linkLabel: string;
}

export interface StudentActionRequiredKpi {
  readonly totalCount: number;
  readonly liveExamsCount: number;
  readonly upcomingExamsCount: number;
  readonly overdueAssignmentsCount: number;
  readonly dueSoonAssignmentsCount: number;
  readonly openAssignmentsCount: number;
  readonly nearestDueTitle: string | null;
  readonly nearestDueAt: string | null;
}

export interface StudentCompletionKpi {
  readonly enrolledCoursesCount: number;
  readonly activeCoursesCount: number;
  readonly completedCoursesCount: number;
  readonly completedItemsCount: number;
  readonly totalItemsCount: number;
  readonly averageProgressPercent: number;
}

export interface StudentAcademicKpi {
  readonly averageScore: number | null;
  readonly gradedAssignmentsCount: number;
  readonly gradedExamsCount: number;
  readonly lowScoreCount: number;
}

export interface StudentMasteryKpi {
  readonly averageMasteryPercent: number;
  readonly totalTopicsCount: number;
  readonly strongCount: number;
  readonly developingCount: number;
  readonly weakCount: number;
}

export interface StudentDashboardKpis {
  readonly actionRequired: StudentActionRequiredKpi;
  readonly completion: StudentCompletionKpi;
  readonly academic: StudentAcademicKpi;
  readonly mastery: StudentMasteryKpi;
}

export interface StudentCourseSummary {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly subjectId: string;
  readonly subjectCode: string;
  readonly subjectName: string;
  readonly semesterCode: string;
  readonly semesterName: string;
  readonly lecturerName: string;
  readonly thumbnailUrl: string | null;
  readonly completedItemsCount: number;
  readonly totalItemsCount: number;
  readonly progressPercent: number;
  readonly openAssignmentsCount: number;
  readonly overdueAssignmentsCount: number;
  readonly liveOrUpcomingExamsCount: number;
  readonly averageScore: number | null;
}

export type StudentWorkItemType = 'EXAM' | 'ASSIGNMENT';

export type StudentWorkItemStatus =
  | 'LIVE'
  | 'OVERDUE'
  | 'DUE_SOON'
  | 'OPEN'
  | 'UPCOMING';

export interface StudentUpcomingWorkItem {
  readonly id: string;
  readonly itemId: string;
  readonly type: StudentWorkItemType;
  readonly status: StudentWorkItemStatus;
  readonly title: string;
  readonly classId: string;
  readonly classCode: string;
  readonly className: string;
  readonly startAt: string | null;
  readonly dueAt: string;
  readonly submissionType: 'FILE' | 'TEXT' | 'BOTH' | null;
  readonly durationMinutes: number | null;
  readonly link: string;
}

export interface StudentStudyActivityPoint {
  /** Calendar day in Asia/Ho_Chi_Minh, formatted YYYY-MM-DD. */
  readonly date: string;
  readonly completedItems: number;
  readonly submissions: number;
}

export interface StudentStudyTrend {
  readonly days: StudentDashboardDays;
  readonly completedItemsTotal: number;
  readonly submissionsTotal: number;
  readonly activeDaysCount: number;
  readonly series: StudentStudyActivityPoint[];
}

export interface StudentRecentGradeItem {
  readonly id: string;
  readonly type: 'ASSIGNMENT' | 'EXAM';
  readonly title: string;
  readonly classId: string;
  readonly classCode: string;
  readonly className: string;
  readonly score: number;
  readonly comment: string | null;
  readonly gradedAt: string;
  readonly link: string;
}

export interface StudentWeakTopicItem {
  readonly id: string;
  readonly kcId: string;
  readonly kcName: string;
  readonly masteryPercent: number;
  readonly attemptsCount: number;
  readonly lastUpdated: string;
}

export interface StudentDashboardOverview {
  readonly kpis: StudentDashboardKpis;
  readonly attention: StudentAttentionItem[];
  readonly courses: StudentCourseSummary[];
  readonly upcomingWork: StudentUpcomingWorkItem[];
  readonly studyTrend: StudentStudyTrend;
  readonly recentGrades: StudentRecentGradeItem[];
  readonly weakTopics: StudentWeakTopicItem[];
  readonly updatedAt: string;
}
