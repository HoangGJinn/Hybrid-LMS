import { useQuery } from '@tanstack/react-query'
import { assignmentService } from '../api/assignment.service'
import { assignmentKeys } from '../api/queryKeys'

// `?? null` because TanStack Query v5 does not accept `undefined` as query data.
export const useAssignment = (id: string) =>
  useQuery({ queryKey: assignmentKeys.detail(id), queryFn: async () => (await assignmentService.getAssignment(id)) ?? null, enabled: id !== '' })
