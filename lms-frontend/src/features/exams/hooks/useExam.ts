import { useQuery } from '@tanstack/react-query'
import { examService } from '../api/exam.service'
import { examKeys } from '../api/queryKeys'

// `?? null` because TanStack Query v5 does not accept `undefined` as query data.
export const useExam = (id: string) =>
  useQuery({ queryKey: examKeys.detail(id), queryFn: async () => (await examService.getExam(id)) ?? null, enabled: id !== '' })
