import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, ChevronDown, Minimize2, Maximize2, PanelLeftClose } from 'lucide-react'
import { cn } from '@shared/utils/cn'
import type { Section } from '../types/courses.types'

interface CourseOutlineProps {
  courseName: string
  /** Items must already be sorted by `orderIndex`. */
  sections: Section[]
  activeSectionId: string | null
  /** Scrolls the page to a section (or to one of its items). */
  onNavigate: (sectionId: string, itemId?: string) => void
  onClose: () => void
  /** Hide the progress bar and completion ticks (lecturer view). Default true. */
  showProgress?: boolean
}

/** Moodle's "course index": every section and item in one sticky list, with progress and "Collapse all". */
export const CourseOutline = ({
  courseName,
  sections,
  activeSectionId,
  onNavigate,
  onClose,
  showProgress = true,
}: CourseOutlineProps) => {
  const navRef = useRef<HTMLElement>(null)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const isAllCollapsed = sections.length > 0 && sections.every((s) => collapsed[s.id])
  const items = sections.flatMap((s) => s.items)
  const done = items.filter((i) => i.isCompleted).length
  const percent = items.length === 0 ? 0 : Math.round((done / items.length) * 100)
  const ToggleAllIcon = isAllCollapsed ? Maximize2 : Minimize2

  // Keep the active section visible inside the outline while the page scrolls.
  useEffect(() => {
    const nav = navRef.current
    if (!nav || !activeSectionId) return
    const row = nav.querySelector<HTMLElement>(`[data-section-id="${activeSectionId}"]`)
    if (!row) return
    const n = nav.getBoundingClientRect()
    const r = row.getBoundingClientRect()
    if (r.top < n.top || r.bottom > n.bottom) {
      nav.scrollTo({
        top: nav.scrollTop + r.top - n.top - nav.clientHeight / 3,
        behavior: 'smooth',
      })
    }
  }, [activeSectionId])

  return (
    <nav
      ref={navRef}
      aria-label="Course index"
      className="rounded-2xl border bg-muted/60 p-3 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto"
    >
      <div className="flex items-center justify-between gap-2 px-2 pb-2">
        <h2 className="m-0 line-clamp-2 text-sm font-semibold">{courseName}</h2>
        <button
          type="button"
          aria-label="Hide course index"
          onClick={onClose}
          className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </div>

      {showProgress && (
        <div className="px-2 pb-3">
          <div
            role="progressbar"
            aria-label="Course progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            className="h-1.5 overflow-hidden rounded-full bg-border"
          >
            <div
              className="h-full rounded-full bg-success transition-all"
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="m-0 mt-1.5 text-xs text-muted-foreground">
            {done} of {items.length} completed
          </p>
        </div>
      )}

      <div className="border-t px-2 pt-2">
        <button
          type="button"
          onClick={() =>
            setCollapsed(Object.fromEntries(sections.map((s) => [s.id, !isAllCollapsed])))
          }
          className="inline-flex items-center gap-2 rounded-md border-0 bg-transparent px-1 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ToggleAllIcon className="h-4 w-4" />
          {isAllCollapsed ? 'Expand all' : 'Collapse all'}
        </button>
      </div>

      <ul className="m-0 list-none space-y-0.5 p-0 pt-1">
        {sections.map((section) => {
          const isOpen = !collapsed[section.id]
          const isActive = section.id === activeSectionId
          return (
            <li key={section.id}>
              <div
                data-section-id={section.id}
                className={cn('flex items-center gap-1 rounded-lg', isActive && 'bg-primary/10')}
              >
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-label={isOpen ? `Collapse ${section.title}` : `Expand ${section.title}`}
                  onClick={() => setCollapsed((c) => ({ ...c, [section.id]: isOpen }))}
                  className="shrink-0 rounded-md border-0 bg-transparent p-1.5 text-muted-foreground hover:text-foreground"
                >
                  <ChevronDown
                    className={cn('h-4 w-4 transition-transform', !isOpen && '-rotate-90')}
                  />
                </button>
                <button
                  type="button"
                  aria-current={isActive ? 'location' : undefined}
                  onClick={() => onNavigate(section.id)}
                  className={cn(
                    'min-w-0 flex-1 truncate border-0 bg-transparent py-1.5 pr-2 text-left text-sm font-semibold',
                    isActive ? 'text-brand' : 'text-foreground',
                  )}
                >
                  {section.title}
                </button>
              </div>
              {isOpen && (
                <ul className="m-0 list-none p-0 pb-1">
                  {section.items.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => onNavigate(section.id, item.id)}
                        className="flex w-full items-center gap-2 rounded-md border-0 bg-transparent py-1.5 pl-9 pr-2 text-left text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      >
                        <span className="min-w-0 flex-1 truncate">{item.title}</span>
                        {showProgress && item.isCompleted && (
                          <CheckCircle2
                            aria-label="Completed"
                            className="h-4 w-4 shrink-0 text-success"
                          />
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          )
        })}
      </ul>
    </nav>
  )
}