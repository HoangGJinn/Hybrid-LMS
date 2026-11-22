import { Link } from 'react-router'
import { Check } from 'lucide-react'
import { cn } from '@shared/utils/cn'
import { ITEM_META } from '../utils/item-meta'
import { formatItemDate } from '../utils/format-item-date'
import type { SectionItem } from '../types/courses.types'

interface StudentItemRowProps {
  item: SectionItem
  href: string
  /** Called when the student follows the link (used to complete documents and videos automatically). */
  onOpen: () => void
  onToggleDone: () => void
}

/** One activity in a section: icon, link, schedule (assignments and exams) and Moodle's "Mark as done" / "Done" button. */
export const StudentItemRow = ({ item, href, onOpen, onToggleDone }: StudentItemRowProps) => {
  const { icon: Icon, color, label } = ITEM_META[item.itemType]
  return (
    <li
      id={`item-${item.id}`}
      className="flex scroll-mt-24 items-center gap-4 rounded-xl border bg-card px-4 py-3"
    >
      <Icon className={cn('h-6 w-6 shrink-0', color)} />
      <div className="min-w-0 flex-1">
        <Link
          to={href}
          onClick={onOpen}
          className="text-sm text-brand no-underline hover:underline"
        >
          {item.title}
        </Link>
        {item.openAt && item.closeAt && (
          <p className="mt-1 flex flex-wrap gap-x-4 text-xs text-muted-foreground">
            <span>
              <span className="font-semibold text-foreground/70">Opened:</span>{' '}
              {formatItemDate(item.openAt)}
            </span>
            <span>
              <span className="font-semibold text-foreground/70">Closes:</span>{' '}
              {formatItemDate(item.closeAt)}
            </span>
          </p>
        )}
      </div>
      <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">{label}</span>
      {item.isCompleted ? (
        <button
          type="button"
          aria-pressed
          title="Click to undo"
          onClick={onToggleDone}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border-0 bg-success/15 px-3 py-1.5 text-sm font-medium text-success transition-colors hover:bg-success/25"
        >
          <Check className="h-4 w-4" />
          Done
        </button>
      ) : (
        <button
          type="button"
          aria-pressed={false}
          onClick={onToggleDone}
          className="shrink-0 rounded-md border bg-card px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
        >
          Mark as done
        </button>
      )}
    </li>
  )
}