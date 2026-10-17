import { useQuery } from '@tanstack/react-query'
import { classService } from '../api/class.service'
import type { ClassRoom } from '../types/courses.types'
import { courseKeys } from '../api/queryKeys'

export const useCourse = (courseId: string) =>
  useQuery({
    queryKey: courseKeys.detail(courseId),
    // Query v5 rejects `undefined` data, so a missing course is stored as null.
    queryFn: async (): Promise<ClassRoom | null> => (await classService.getClassById(courseId)) ?? null,
    enabled: courseId !== '',
  })

export const useCourseSections = (courseId: string) =>
  useQuery({
    queryKey: courseKeys.sections(courseId),
    queryFn: async () => [...(await classService.getSections(courseId))].sort((a, b) => a.orderIndex - b.orderIndex),
    enabled: courseId !== '',
  })
