import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ClipboardList,
  FileText,
  PenSquare,
  Plus,
  Trash2,
} from 'lucide-react'
import { Button } from '@shared/components/ui/button'
import { Input } from '@shared/components/ui/input'
import { cn } from '@shared/utils/cn'
import { moveItem } from '../utils/move-item'
import type { ItemType, Section, SectionItem } from '../types/courses.types'

const itemIcon = {
  DOCUMENT: FileText,
  ASSIGNMENT: ClipboardList,
  EXAM: PenSquare,
}

const itemTypes: ItemType[] = ['DOCUMENT', 'ASSIGNMENT', 'EXAM']

interface SectionCardProps {
  section: Section
  isOpen: boolean
  isEditing: boolean
  /** Label of the "collapse all / expand all" link; omitted on every card but the first. */
  toggleAllLabel?: string
  onToggle: () => void
  onToggleAll: () => void
  onTitleChange: (title: string) => void
  onDescriptionChange: (description: string) => void
  onItemsChange: (items: SectionItem[]) => void
  onAddItem: (itemType: ItemType) => void
  onMoveUp: () => void
  onMoveDown: () => void
  onDelete: () => void
}

/** One rounded week card: circular chevron, large title, then its items. */
export const SectionCard = ({
  section,
  isOpen,
  isEditing,
  toggleAllLabel,
  onToggle,
  onToggleAll,
  onTitleChange,
  onDescriptionChange,
  onItemsChange,
  onAddItem,
  onMoveUp,
  onMoveDown,
  onDelete,
}: SectionCardProps) => {
  const items = section.items
  const hasDescription = Boolean(section.description?.trim())
  const hasBody = isOpen && (items.length > 0 || isEditing || hasDescription)
  return (
    <div className="rounded-2xl border bg-card">
      <div
        className={cn(
          'mx-5 flex items-center gap-4 py-5',
          hasBody && 'border-b',
        )}
      >
        <button
          type="button"
          aria-expanded={isOpen}
          aria-label={isOpen ? 'Collapse section' : 'Expand section'}
          onClick={onToggle}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-0 bg-accent text-brand"
        >
          <ChevronDown
            className={cn('h-5 w-5 transition', !isOpen && '-rotate-90')}
          />
        </button>
        {isEditing ? (
          <Input
            aria-label="Section title"
            value={section.title}
            onChange={(e) => onTitleChange(e.target.value)}
            className="flex-1"
          />
        ) : (
          <h2 className="m-0 flex-1 text-xl font-medium">{section.title}</h2>
        )}
        {isEditing && (
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" aria-label="Move section up" onClick={onMoveUp}>
              <ArrowUp className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" aria-label="Move section down" onClick={onMoveDown}>
              <ArrowDown className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" aria-label="Delete section" onClick={onDelete}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        )}
        {toggleAllLabel && (
          <button
            type="button"
            onClick={onToggleAll}
            className="border-0 bg-transparent p-0 text-sm text-brand hover:underline"
          >
            {toggleAllLabel}
          </button>
        )}
      </div>
      {isOpen && (isEditing || hasDescription) && (
      <div className="mx-5 pt-4">
        {isEditing ? (
          <textarea
            aria-label="Section description"
            placeholder="Section description (optional)"
            rows={4}
            value={section.description ?? ''}
            onChange={(e) => onDescriptionChange(e.target.value)}
            className="w-full rounded-md border bg-background p-3 text-sm"
          />
        ) : (
          <p className="m-0 whitespace-pre-line text-sm text-muted-foreground">
            {section.description}
          </p>
        )}
      </div>
    )}
      {hasBody && (
        <ul className="m-0 list-none space-y-1 px-5 py-4">
          {items.map((item, index) => {
            const Icon = itemIcon[item.itemType]
            return (
              <li
                key={item.id}
                className="flex items-center gap-4 rounded-md px-3 py-3 hover:bg-muted/50"
              >
                <Icon className="h-6 w-6 shrink-0 text-brand" />
                {isEditing ? (
                  <Input
                    aria-label="Item title"
                    value={item.title}
                    onChange={(e) =>
                      onItemsChange(
                        items.map((x) =>
                          x.id === item.id ? { ...x, title: e.target.value } : x,
                        ),
                      )
                    }
                    className="h-8 flex-1"
                  />
                ) : (
                  <span className="flex-1 text-sm text-brand">{item.title}</span>
                )}
                <span className="text-xs text-muted-foreground">{item.itemType}</span>
                {isEditing && (
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" aria-label="Move item up" onClick={() => onItemsChange(moveItem(items, index, -1))}>
                      <ArrowUp className="h-3 w-3" />
                    </Button>
                    <Button size="icon" variant="ghost" aria-label="Move item down" onClick={() => onItemsChange(moveItem(items, index, 1))}>
                      <ArrowDown className="h-3 w-3" />
                    </Button>
                    <Button size="icon" variant="ghost" aria-label="Delete item" onClick={() => onItemsChange(items.filter((x) => x.id !== item.id))}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                )}
              </li>
            )
          })}
          {isEditing && (
            <li className="flex flex-wrap gap-2 px-3 pt-2">
              {itemTypes.map((type) => (
                <Button key={type} size="sm" variant="outline" onClick={() => onAddItem(type)}>
                  <Plus className="mr-1 h-3 w-3" />
                  {type.charAt(0) + type.slice(1).toLowerCase()}
                </Button>
              ))}
            </li>
          )}
        </ul>
      )}
    </div>
  )
}