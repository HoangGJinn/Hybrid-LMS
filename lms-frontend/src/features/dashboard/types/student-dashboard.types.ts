export type StudentDashboardDays = 7 | 14 | 30;

export type StudentAttentionSeverity = 'critical' | 'warning' | 'ok';

export type StudentAttentionKey =
  | 'exams_schedule'
  | 'assignment_deadlines'
  | 'knowledge_review';

export interface StudentAttentionClassRef {
  id: string;
  code: string;
  name: string;
}

export interface StudentAttentionItem {
  key: StudentAttentionKey;
  label: string;
  severity: StudentAttentionSeverity;
  title: string;
  detail?: string;
  count: number;
  classes?: StudentAttentionClassRef[];
  link: string;
  linkLabel: string;
}

export interface StudentActionRequiredKpi {
  totalCount: number;
  liveExamsCount: number;
  upcomingExamsCount: number;
  overdueAssignmentsCount: number;
  dueSoonAssignmentsCount: number;
  openAssignmentsCount: number;
  nearestDueTitle: string | null;
  nearestDueAt: string | null;
}

export interface StudentCompletionKpi {
  enrolledCoursesCount: number;
  activeCoursesCount: number;
  completedCoursesCount: number;
  completedItemsCount: number;
  totalItemsCount: number;
  averageProgressPercent: number;
}

export interface StudentAcademicKpi {
  averageScore: number | null;
  gradedAssignmentsCount: number;
  gradedExamsCount: number;
  lowScoreCount: number;
}

export interface StudentMasteryKpi {
  averageMasteryPercent: number;
  totalTopicsCount: number;
  strongCount: number;
  developingCount: number;
  weakCount: number;
}

export interface StudentDashboardKpis {
  actionRequired: StudentActionRequiredKpi;
  completion: StudentCompletionKpi;
  academic: StudentAcademicKpi;
  mastery: StudentMasteryKpi;
}

export interface StudentCourseSummary {
  id: string;
  code: string;
  name: string;
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  semesterCode: string;
  semesterName: string;
  lecturerName: string;
  thumbnailUrl: string | null;
  completedItemsCount: number;
  totalItemsCount: number;
  progressPercent: number;
  openAssignmentsCount: number;
  overdueAssignmentsCount: number;
  liveOrUpcomingExamsCount: number;
  averageScore: number | null;
}

export type StudentWorkItemType = 'EXAM' | 'ASSIGNMENT';

export type StudentWorkItemStatus =
  | 'LIVE'
  | 'OVERDUE'
  | 'DUE_SOON'
  | 'OPEN'
  | 'UPCOMING';

export interface StudentUpcomingWorkItem {
  id: string;
  itemId: string;
  type: StudentWorkItemType;
  status: StudentWorkItemStatus;
  title: string;
  classId: string;
  classCode: string;
  className: string;
  startAt: string | null;
  dueAt: string;
  submissionType: 'FILE' | 'TEXT' | 'BOTH' | null;
  durationMinutes: number | null;
  link: string;
}

export interface StudentStudyActivityPoint {
  date: string;
  completedItems: number;
  submissions: number;
}

export interface StudentStudyTrend {
  days: StudentDashboardDays;
  completedItemsTotal: number;
  submissionsTotal: number;
  activeDaysCount: number;
  series: StudentStudyActivityPoint[];
}

export interface StudentRecentGradeItem {
  id: string;
  type: 'ASSIGNMENT' | 'EXAM';
  title: string;
  classId: string;
  classCode: string;
  className: string;
  score: number;
  comment: string | null;
  gradedAt: string;
  link: string;
}

export interface StudentWeakTopicItem {
  id: string;
  kcId: string;
  kcName: string;
  masteryPercent: number;
  attemptsCount: number;
  lastUpdated: string;
}

export interface StudentDashboardOverview {
  kpis: StudentDashboardKpis;
  attention: StudentAttentionItem[];
  courses: StudentCourseSummary[];
  upcomingWork: StudentUpcomingWorkItem[];
  studyTrend: StudentStudyTrend;
  recentGrades: StudentRecentGradeItem[];
  weakTopics: StudentWeakTopicItem[];
  updatedAt: string;
}
