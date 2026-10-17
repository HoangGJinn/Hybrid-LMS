import { useMyAssignments, useMySubmissions } from '@features/assignments'
import { combineQueries } from '@shared/utils/async-state'
import type { GradeRow } from '../types/grading.types'

/** Per-course grade table, derived from the cached assignments and submissions (no cache entry of its own to keep in sync). */
export const useCourseGrades = (courseId: string) => {
  const assignments = useMyAssignments()
  const submissions = useMySubmissions()
  return combineQueries([assignments, submissions] as const, ([assignmentList, submissionList]): GradeRow[] =>
    assignmentList
      .filter((assignment) => assignment.classId === courseId)
      .sort((a, b) => +new Date(a.endAt) - +new Date(b.endAt))
      .map((assignment) => ({ assignment, submission: submissionList.find((submission) => submission.assignmentId === assignment.id) ?? null })),
  )
}
