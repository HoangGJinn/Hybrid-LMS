export interface ClassOverviewStats {
  readonly activeCount: number;
  readonly endedCount: number;
  readonly currentSemesterCount: number;
}

export interface StudentOverviewStats {
  readonly totalCount: number;
  readonly studyingCount: number;
  readonly pendingCount: number;
  readonly inactiveCount: number;
}

export interface LecturerOverviewStats {
  readonly totalCount: number;
  readonly workingCount: number;
  readonly pendingCount: number;
  readonly inactiveCount: number;
}

export interface ActiveSemesterOverview {
  readonly id: string;
  readonly semesterCode: string;
  readonly name: string;
  readonly startDate: Date;
  readonly endDate: Date;
  readonly progressPercent: number;
  readonly daysRemaining: number;
}

export interface OnlineUserView {
  readonly id: string;
  readonly fullName: string;
  readonly email: string;
  readonly avatarUrl: string | null;
  readonly role: string;
  readonly code: string | null;
  readonly lastSeenAt: Date;
}

export interface TrafficOverviewStats {
  readonly onlineNowCount: number;
  readonly activeUsersTodayCount: number;
  readonly loginsTodayCount: number;
  readonly failedLogins24hCount: number;
  readonly onlineUsers: OnlineUserView[];
}

export interface AttentionClassItem {
  readonly id: string;
  readonly classCode: string;
  readonly name: string;
  readonly lecturerName: string;
}

export interface AdminAttentionOverview {
  readonly emptyActiveClasses: AttentionClassItem[];
  readonly emptyActiveClassesCount: number;
  readonly classesWithInactiveLecturer: AttentionClassItem[];
  readonly classesWithInactiveLecturerCount: number;
}

export interface SubjectDistributionItem {
  readonly subjectId: string;
  readonly subjectCode: string;
  readonly subjectName: string;
  readonly activeClassCount: number;
  readonly enrolledStudentCount: number;
}

export interface LoginTrendPoint {
  /** Calendar day in Asia/Ho_Chi_Minh, formatted YYYY-MM-DD. */
  readonly date: string;
  readonly succeeded: number;
  readonly failed: number;
  readonly activeUsers: number;
}

export interface HourlyActivityPoint {
  /** Hour of day 0..23 in Asia/Ho_Chi_Minh. */
  readonly hour: number;
  readonly count: number;
}

export interface AdminDashboardTrends {
  readonly days: number;
  readonly loginsByDay: LoginTrendPoint[];
  /** Audit events per hour of day over the last 7 days (0..23, zero-filled). */
  readonly activityByHour: HourlyActivityPoint[];
}

export interface AdminDashboardOverview {
  readonly classes: ClassOverviewStats;
  readonly students: StudentOverviewStats;
  readonly lecturers: LecturerOverviewStats;
  readonly activeSemester: ActiveSemesterOverview | null;
  readonly traffic: TrafficOverviewStats;
  readonly attention: AdminAttentionOverview;
  readonly subjectDistribution: SubjectDistributionItem[];
  readonly trends: AdminDashboardTrends;
}
