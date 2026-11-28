export interface ClassOverviewStats {
  activeCount: number;
  endedCount: number;
  currentSemesterCount: number;
}

export interface StudentOverviewStats {
  totalCount: number;
  studyingCount: number;
  pendingCount: number;
  inactiveCount: number;
}

export interface LecturerOverviewStats {
  totalCount: number;
  workingCount: number;
  pendingCount: number;
  inactiveCount: number;
}

export interface ActiveSemesterOverview {
  id: string;
  semesterCode: string;
  name: string;
  startDate: string;
  endDate: string;
  progressPercent: number;
  daysRemaining: number;
}

export interface OnlineUserItem {
  id: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  role: 'ADMIN' | 'LECTURER' | 'STUDENT' | string;
  code: string | null;
  lastSeenAt: string;
}

export interface TrafficOverviewStats {
  onlineNowCount: number;
  activeUsersTodayCount: number;
  loginsTodayCount: number;
  failedLogins24hCount: number;
  onlineUsers: OnlineUserItem[];
}

export interface AttentionClassItem {
  id: string;
  classCode: string;
  name: string;
  lecturerName: string;
}

export interface AdminAttentionOverview {
  emptyActiveClasses: AttentionClassItem[];
  emptyActiveClassesCount?: number;
  classesWithInactiveLecturer: AttentionClassItem[];
  classesWithInactiveLecturerCount?: number;
}

export interface SubjectDistributionItem {
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  activeClassCount: number;
  enrolledStudentCount: number;
}

export interface LoginTrendPoint {
  /** Calendar day (Asia/Ho_Chi_Minh), YYYY-MM-DD. */
  date: string;
  succeeded: number;
  failed: number;
  activeUsers: number;
}

export interface HourlyActivityPoint {
  /** Hour of day, 0..23. */
  hour: number;
  count: number;
}

export interface AdminDashboardTrends {
  days: number;
  loginsByDay: LoginTrendPoint[];
  activityByHour: HourlyActivityPoint[];
}

export type TrendDays = 7 | 14 | 30;

export interface AdminDashboardOverview {
  classes: ClassOverviewStats;
  students: StudentOverviewStats;
  lecturers: LecturerOverviewStats;
  activeSemester: ActiveSemesterOverview | null;
  traffic: TrafficOverviewStats;
  attention: AdminAttentionOverview;
  subjectDistribution: SubjectDistributionItem[];
  trends: AdminDashboardTrends;
}
