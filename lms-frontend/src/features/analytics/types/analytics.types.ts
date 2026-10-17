export interface KcClassStat { kcId: string; kcName: string; avgMastery: number }

export interface ClassAnalytics {
  classId: string
  avgScore: number
  completionRate: number
  scoreDistribution: { range: string; count: number }[]
  kcStats: KcClassStat[]
  weeklyActivity: { week: string; active: number }[]
}
