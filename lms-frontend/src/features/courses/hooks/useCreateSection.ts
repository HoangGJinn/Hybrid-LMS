import { useMutation, useQueryClient } from '@tanstack/react-query'
import { courseKeys } from '../api/queryKeys'
import { sectionService } from '../api/section.service'

/** Adds a section to a class and refreshes the course data. */
export const useCreateSection = (courseId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (title: string) => sectionService.create(courseId, title),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: courseKeys.all }),
  })
}
