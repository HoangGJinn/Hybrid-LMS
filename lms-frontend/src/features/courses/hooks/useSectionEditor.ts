import { useIsMutating, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { courseKeys } from '../api/queryKeys'
import {
  sectionService,
  type ItemPatch,
  type NewItemInput,
  type SectionPatch,
} from '../api/section.service'
import type { Section } from '../types/courses.types'

type Apply<V> = (sections: Section[], variables: V) => Section[]

/** The listed ids first (in that order), then everything else in its current order. */
const sortByIds = <T extends { id: string }>(list: T[], ids: readonly string[]): T[] => {
  const first = ids.flatMap((id) => list.find((x) => x.id === id) ?? [])
  return [...first, ...list.filter((x) => !ids.includes(x.id))]
}

const renumber = <T extends { orderIndex: number }>(list: T[]): T[] =>
  list.map((x, index) => ({ ...x, orderIndex: index + 1 }))

/**
 * One auto-saved change: the cached sections are updated at once (when `apply` is given),
 * rolled back with an error toast if the server refuses, and refetched once the last pending save is done.
 */
const useSectionMutation = <V>(
  courseId: string,
  mutationFn: (variables: V) => Promise<unknown>,
  apply?: Apply<V>,
) => {
  const queryClient = useQueryClient()
  const key = courseKeys.sections(courseId)
  return useMutation({
    mutationKey: key,
    mutationFn,
    onMutate: async (variables: V) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<Section[]>(key)
      if (previous && apply) queryClient.setQueryData(key, apply(previous, variables))
      return { previous }
    },
    onError: (error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous)
      toast.error(error.message)
    },
    onSettled: () => {
      // This mutation still counts as pending here; refetch only when nothing else is being saved.
      if (queryClient.isMutating({ mutationKey: key }) <= 1) {
        void queryClient.invalidateQueries({ queryKey: key })
      }
    },
  })
}

/** Every edit of the course page, saved to the server as soon as it is made (Moodle-style). */
export const useSectionEditor = (courseId: string) => {
  const isSaving = useIsMutating({ mutationKey: courseKeys.sections(courseId) }) > 0

  const createSection = useSectionMutation(courseId, (title: string) =>
    sectionService.create(courseId, title),
  )

  const updateSection = useSectionMutation(
    courseId,
    (v: { id: string; patch: SectionPatch }) => sectionService.update(courseId, v.id, v.patch),
    (sections, v) => sections.map((s) => (s.id === v.id ? { ...s, ...v.patch } : s)),
  )

  const removeSection = useSectionMutation(courseId, (id: string) =>
    sectionService.remove(courseId, id),
  )

  const reorderSections = useSectionMutation(
    courseId,
    (ids: string[]) => sectionService.reorder(courseId, ids),
    (sections, ids) => renumber(sortByIds(sections, ids)),
  )

  const addItem = useSectionMutation(
    courseId,
    (v: { sectionId: string; item: NewItemInput }) =>
      sectionService.createItem(courseId, v.sectionId, v.item),
  )

  const updateItem = useSectionMutation(
    courseId,
    (v: { sectionId: string; itemId: string; patch: ItemPatch }) =>
      sectionService.updateItem(courseId, v.sectionId, v.itemId, v.patch),
    (sections, v) =>
      sections.map((s) =>
        s.id === v.sectionId
          ? { ...s, items: s.items.map((i) => (i.id === v.itemId ? { ...i, ...v.patch } : i)) }
          : s,
      ),
  )

  const removeItem = useSectionMutation(
    courseId,
    (v: { sectionId: string; itemId: string }) =>
      sectionService.removeItem(courseId, v.sectionId, v.itemId),
  )

  const reorderItems = useSectionMutation(
    courseId,
    (v: { sectionId: string; ids: string[] }) =>
      sectionService.reorderItems(courseId, v.sectionId, v.ids),
    (sections, v) =>
      sections.map((s) =>
        s.id === v.sectionId ? { ...s, items: renumber(sortByIds(s.items, v.ids)) } : s,
      ),
  )

  return {
    isSaving,
    createSection,
    updateSection,
    removeSection,
    reorderSections,
    addItem,
    updateItem,
    removeItem,
    reorderItems,
  }
}