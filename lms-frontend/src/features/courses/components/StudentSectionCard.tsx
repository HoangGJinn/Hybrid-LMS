import { ChevronDown } from 'lucide-react'
import { cn } from '@shared/utils/cn'
import type { Section, SectionItem } from '../types/courses.types'
import { StudentItemRow } from './StudentItemRow'

interface StudentSectionCardProps {
  /** Items must already be sorted by `orderIndex`. */
  section: Section
  isOpen: boolean
  itemHref: (item: SectionItem) => string
  onToggle: () => void
  onOpenItem: (item: SectionItem) => void
  onToggleDone: (item: SectionItem) => void
}

/** A week / topic card of the student's course page. The id lets the course index scroll here. */
export const StudentSectionCard = ({
  section,
  isOpen,
  itemHref,
  onToggle,
  onOpenItem,
  onToggleDone,
}: StudentSectionCardProps) => {
  const done = section.items.filter((i) => i.isCompleted).length
  const description = section.description?.trim() ?? ''
  return (
    <section id={`section-${section.id}`} className="scroll-mt-4 rounded-2xl border bg-card">
      <header className="flex items-center gap-3 px-5 py-4">
        <button
          type="button"
          aria-expanded={isOpen}
          aria-label={isOpen ? `Collapse ${section.title}` : `Expand ${section.title}`}
          onClick={onToggle}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border bg-card text-brand transition-colors hover:bg-accent"
        >
          <ChevronDown className={cn('h-4 w-4 transition-transform', !isOpen && '-rotate-90')} />
        </button>
        <h2 className="m-0 min-w-0 flex-1 text-lg font-semibold">{section.title}</h2>
        {section.items.length > 0 && (
          <span className="shrink-0 text-xs text-muted-foreground">
            {done}/{section.items.length} completed
          </span>
        )}
      </header>
      {isOpen && (
        <div className="space-y-3 border-t px-5 pb-5 pt-4">
          {description !== '' && (
            <p className="m-0 whitespace-pre-line text-sm text-muted-foreground">{description}</p>
          )}
          {section.items.length > 0 ? (
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {section.items.map((item) => (
                <StudentItemRow
                  key={item.id}
                  item={item}
                  href={itemHref(item)}
                  onOpen={() => onOpenItem(item)}
                  onToggleDone={() => onToggleDone(item)}
                />
              ))}
            </ul>
          ) : (
            description === '' && (
              <p className="m-0 text-sm text-muted-foreground">No content in this section yet.</p>
            )
          )}
        </div>
      )}
    </section>
  )
}