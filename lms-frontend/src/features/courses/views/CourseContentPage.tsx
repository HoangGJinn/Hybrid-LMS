import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { CheckCircle2, ChevronDown, Circle, ClipboardList, FileText, PenSquare } from 'lucide-react'
import { AsyncView } from '@shared/components/AsyncView'
import { EmptyState } from '@shared/components/EmptyState'
import { useCourseSections } from '../hooks/useCourse'
import { toAsyncState } from '@shared/utils/async-state'
import { cn } from '@shared/utils/cn'
import type { SectionItem } from '../types/courses.types'

const itemIcon = { DOCUMENT: FileText, ASSIGNMENT: ClipboardList, EXAM: PenSquare }

const itemLink = (courseId: string, item: SectionItem) => {
  if (item.itemType === 'DOCUMENT' && item.documentId) return `/student/courses/${courseId}/documents/${item.documentId}`
  if (item.itemType === 'ASSIGNMENT' && item.assignmentId) return `/student/courses/${courseId}/assignments/${item.assignmentId}`
  return '/student/exams'
}

const CourseContentPage = () => {
  const { courseId = '' } = useParams()
  const state = toAsyncState(useCourseSections(courseId))
  const [open, setOpen] = useState<Record<string, boolean>>({})

  return (
    <AsyncView state={state} isEmpty={(sections) => sections.length === 0} empty={<EmptyState title="No content yet" description="Your lecturer has not published any sections." />}>
      {(sections) => (
        <div className="space-y-3">
          {sections.map((s) => {
            const isOpen = open[s.id] ?? true
            const done = s.items.filter((i) => i.isCompleted).length
            return (
              <div key={s.id} className="rounded-lg border bg-card">
                <button type="button" aria-expanded={isOpen} onClick={() => setOpen((o) => ({ ...o, [s.id]: !isOpen }))} className="flex w-full items-center justify-between gap-3 border-0 bg-transparent p-4 text-left text-foreground">
                  <span className="font-semibold">{s.title}</span>
                  <span className="flex items-center gap-3 text-xs text-muted-foreground">
                    {done}/{s.items.length} completed
                    <ChevronDown className={cn('h-4 w-4 transition', isOpen && 'rotate-180')} />
                  </span>
                </button>
                {isOpen && (
                  <ul className="m-0 list-none border-t p-0">
                    {s.items.length === 0 && <li className="p-4 text-sm text-muted-foreground">No items in this section.</li>}
                    {[...s.items].sort((a, b) => a.orderIndex - b.orderIndex).map((item) => {
                      const Icon = itemIcon[item.itemType]
                      return (
                        <li key={item.id} className="border-b last:border-b-0">
                          <Link to={itemLink(courseId, item)} className="flex items-center gap-3 px-4 py-3 text-sm text-foreground no-underline hover:bg-muted/50">
                            <Icon className="h-4 w-4 text-brand" />
                            <span className="flex-1">{item.title}</span>
                            <span className="text-xs text-muted-foreground">{item.itemType}</span>
                            {item.isCompleted ? <CheckCircle2 className="h-4 w-4 text-success" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            )
          })}
        </div>
      )}
    </AsyncView>
  )
}

export default CourseContentPage
