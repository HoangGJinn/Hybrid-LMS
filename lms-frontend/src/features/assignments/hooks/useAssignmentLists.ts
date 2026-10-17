import { useQuery } from '@tanstack/react-query'
import { assignmentService } from '../api/assignment.service'
import { assignmentKeys } from '../api/queryKeys'

/** Assignments of every class the signed-in student is enrolled in. */
export const useMyAssignments = () =>
  useQuery({ queryKey: assignmentKeys.mine, queryFn: () => assignmentService.getMyAssignments() })

/** Submissions of the signed-in student across all classes. */
export const useMySubmissions = () =>
  useQuery({ queryKey: assignmentKeys.mySubmissions, queryFn: () => assignmentService.getMySubmissions() })

/** Every submission of one assignment. */
export const useAssignmentSubmissions = (assignmentId: string) =>
  useQuery({
    queryKey: assignmentKeys.submissions(assignmentId),
    queryFn: () => assignmentService.getSubmissions(assignmentId),
    enabled: assignmentId !== '',
  })
