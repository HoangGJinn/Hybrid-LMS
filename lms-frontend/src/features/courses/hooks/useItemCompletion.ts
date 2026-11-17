import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { courseKeys } from '../api/queryKeys'
import { sectionService } from '../api/section.service'
import type { Section } from '../types/courses.types'

/** A student marks an item as done / not done. The tick shows at once and rolls back if the server refuses. */
export const useItemCompletion = (courseId: string) => {
  const queryClient = useQueryClient()
  const key = courseKeys.sections(courseId)
  return useMutation({
    mutationFn: (v: { itemId: string; completed: boolean }) =>
      sectionService.setCompletion(courseId, v.itemId, v.completed),
    onMutate: async (v) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<Section[]>(key)
      if (previous) {
        queryClient.setQueryData<Section[]>(
          key,
          previous.map((section) => ({
            ...section,
            items: section.items.map((item) =>
              item.id === v.itemId ? { ...item, isCompleted: v.completed } : item,
            ),
          })),
        )
      }
      return { previous }
    },
    onError: (error, _v, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous)
      toast.error(error.message)
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: key })
    },
  })
}