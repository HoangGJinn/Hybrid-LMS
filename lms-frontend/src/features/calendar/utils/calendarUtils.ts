import { pad } from '@shared/utils/format'

/** Local-time YYYY-MM-DD key (not UTC), so an event lands on the day the user sees. */
export const dateKey = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export const startOfMonth = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), 1)

export const addMonths = (d: Date, n: number): Date => new Date(d.getFullYear(), d.getMonth() + n, 1)

export const isSameMonth = (a: Date, b: Date): boolean => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()

/** 6 weeks x 7 days = 42 cells covering the month, starting on Monday by default. */
export const buildMonthGrid = (month: Date, weekStartsOn: 0 | 1 = 1): Date[] => {
  const first = startOfMonth(month)
  const offset = (first.getDay() - weekStartsOn + 7) % 7
  return Array.from({ length: 42 }, (_, i) => new Date(first.getFullYear(), first.getMonth(), 1 - offset + i))
}

export const weekdayLabels = (weekStartsOn: 0 | 1 = 1): string[] => {
  const all = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return [...all.slice(weekStartsOn), ...all.slice(0, weekStartsOn)]
}
