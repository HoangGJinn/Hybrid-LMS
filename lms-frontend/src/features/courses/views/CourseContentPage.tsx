import { useState } from 'react'
import { useParams } from 'react-router'
import { Maximize2, Minimize2, PanelLeftOpen } from 'lucide-react'
import { AsyncView } from '@shared/components/AsyncView'
import { EmptyState } from '@shared/components/EmptyState'
import { Button } from '@shared/components/ui/button'
import { toAsyncState } from '@shared/utils/async-state'
import { cn } from '@shared/utils/cn'
import { CourseOutline } from '../components/CourseOutline'
import { StudentSectionCard } from '../components/StudentSectionCard'
import { useActiveSection } from '../hooks/useActiveSection'
import { useCourse, useCourseSections } from '../hooks/useCourse'
import { useItemCompletion } from '../hooks/useItemCompletion'
import type { SectionItem } from '../types/courses.types'

const itemLink = (courseId: string, item: SectionItem) => {
  if (item.itemType === 'DOCUMENT' && item.documentId)
    return `/student/courses/${courseId}/documents/${item.documentId}`
  if (item.itemType === 'VIDEO') return `/student/courses/${courseId}/videos/${item.id}`
  if (item.itemType === 'ASSIGNMENT' && item.assignmentId)
    return `/student/courses/${courseId}/assignments/${item.assignmentId}`
  if (item.itemType === 'EXAM' && item.examId)
    return `/student/courses/${courseId}/exams/${item.examId}`
  return '/student/exams'
}

/** Reading a document or watching a video counts as done; assignments and exams are marked by hand. */
const COMPLETES_ON_OPEN = new Set<SectionItem['itemType']>(['DOCUMENT', 'VIDEO'])

/** Course tab of a student's class: Moodle-style course index on the left, section cards on the right. */
const CourseContentPage = () => {
  const { courseId = '' } = useParams()
  const state = toAsyncState(useCourseSections(courseId))
  const course = useCourse(courseId).data
  const completion = useItemCompletion(courseId)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  // The index is open on wide screens and tucked away on phones.
  const [isOutlineOpen, setIsOutlineOpen] = useState(
    () => window.matchMedia('(min-width: 1024px)').matches,
  )
  const activeSectionId = useActiveSection((state.data ?? []).map((s) => s.id))

  const handleNavigate = (sectionId: string, itemId?: string) => {
    setCollapsed((c) => ({ ...c, [sectionId]: false }))
    window.requestAnimationFrame(() =>
      document
        .getElementById(itemId ? `item-${itemId}` : `section-${sectionId}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    )
  }

  const handleOpenItem = (item: SectionItem) => {
    if (item.isCompleted || !COMPLETES_ON_OPEN.has(item.itemType)) return
    completion.mutate({ itemId: item.id, completed: true })
  }

  return (
    <AsyncView
      state={state}
      isEmpty={(sections) => sections.length === 0}
      empty={
        <EmptyState
          title="No content yet"
          description="Your lecturer has not published any sections."
        />
      }
    >
      {(serverSections) => {
        const sections = serverSections.map((s) => ({
          ...s,
          items: [...s.items].sort((a, b) => a.orderIndex - b.orderIndex),
        }))
        const isAllCollapsed = sections.every((s) => collapsed[s.id])
        const ToggleAllIcon = isAllCollapsed ? Maximize2 : Minimize2
        return (
          <div className={cn('grid gap-6', isOutlineOpen && 'lg:grid-cols-[18rem_minmax(0,1fr)]')}>
            {isOutlineOpen && (
              <aside>
                <CourseOutline
                  courseName={course?.name ?? ''}
                  sections={sections}
                  activeSectionId={activeSectionId}
                  onNavigate={handleNavigate}
                  onClose={() => setIsOutlineOpen(false)}
                />
              </aside>
            )}
            <div className="min-w-0 space-y-4">
              <div className="flex items-center justify-between gap-3">
                {isOutlineOpen ? (
                  <span />
                ) : (
                  <Button variant="outline" size="sm" onClick={() => setIsOutlineOpen(true)}>
                    <PanelLeftOpen className="mr-2 h-4 w-4" />
                    Course index
                  </Button>
                )}
                <button
                  type="button"
                  onClick={() =>
                    setCollapsed(Object.fromEntries(sections.map((s) => [s.id, !isAllCollapsed])))
                  }
                  className="inline-flex items-center gap-2 border-0 bg-transparent p-0 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  <ToggleAllIcon className="h-4 w-4" />
                  {isAllCollapsed ? 'Expand all' : 'Collapse all'}
                </button>
              </div>
              {sections.map((section) => (
                <StudentSectionCard
                  key={section.id}
                  section={section}
                  isOpen={!collapsed[section.id]}
                  itemHref={(item) => itemLink(courseId, item)}
                  onToggle={() => setCollapsed((c) => ({ ...c, [section.id]: !c[section.id] }))}
                  onOpenItem={handleOpenItem}
                  onToggleDone={(item) =>
                    completion.mutate({ itemId: item.id, completed: !item.isCompleted })
                  }
                />
              ))}
            </div>
          </div>
        )
      }}
    </AsyncView>
  )
}

export default CourseContentPage