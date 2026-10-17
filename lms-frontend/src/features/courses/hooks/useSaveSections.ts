import { useMutation, useQueryClient } from '@tanstack/react-query'
import { classService } from '../api/class.service'
import type { Section } from '../types/courses.types'
import { courseKeys } from '../api/queryKeys'

/** Saves the edited sections of a course; the mutation stays pending until the sections are refetched. */
export const useSaveSections = (courseId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (sections: Section[]) => classService.saveSections(courseId, sections),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: courseKeys.sections(courseId) }),
  })
}
