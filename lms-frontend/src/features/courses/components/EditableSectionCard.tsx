import { ArrowDown, ArrowUp, ChevronDown, Eye, EyeOff, Plus, Trash2 } from 'lucide-react'
import { cn } from '@shared/utils/cn'
import type { Section, SectionItem } from '../types/courses.types'
import { ActionMenu, type MenuAction } from './ActionMenu'
import { InlineEditText } from './InlineEditText'
import { SectionItemRow } from './SectionItemRow'

interface EditableSectionCardProps {
  /** Items must already be sorted by `orderIndex`. */
  section: Section
  index: number
  total: number
  isEditing: boolean
  isOpen: boolean
  /** Only the first card shows "Collapse all" / "Expand all". */
  toggleAllLabel?: string
  itemHref: (item: SectionItem) => string | null
  onToggle: () => void
  onToggleAll: () => void
  onRename: (title: string) => void
  onDescriptionChange: (description: string) => void
  onToggleVisible: () => void
  onMove: (direction: -1 | 1) => void
  onDelete: () => void
  onAddContent: () => void
  onItemRename: (item: SectionItem, title: string) => void
  onItemToggleVisible: (item: SectionItem) => void
  onItemMove: (item: SectionItem, direction: -1 | 1) => void
  onItemRemove: (item: SectionItem) => void
}

/** A week / topic card. View mode is clean; edit mode adds pencils, a ⋮ menu and the "Add content" button. */
export const EditableSectionCard = ({
  section,
  index,
  total,
  isEditing,
  isOpen,
  toggleAllLabel,
  itemHref,
  onToggle,
  onToggleAll,
  onRename,
  onDescriptionChange,
  onToggleVisible,
  onMove,
  onDelete,
  onAddContent,
  onItemRename,
  onItemToggleVisible,
  onItemMove,
  onItemRemove,
}: EditableSectionCardProps) => {
  const isHidden = section.isVisible === false

  const actions: MenuAction[] = [
    {
      label: isHidden ? 'Show to students' : 'Hide from students',
      icon: isHidden ? Eye : EyeOff,
      onSelect: onToggleVisible,
    },
    { label: 'Move up', icon: ArrowUp, onSelect: () => onMove(-1), disabled: index === 0 },
    { label: 'Move down', icon: ArrowDown, onSelect: () => onMove(1), disabled: index === total - 1 },
    { label: 'Delete section', icon: Trash2, onSelect: onDelete, danger: true },
  ]

  return (
    <section className={cn('rounded-2xl border bg-card', isHidden && 'border-dashed bg-muted/30')}>
      <header className="flex items-center gap-3 px-5 py-4">
        <button
          type="button"
          aria-expanded={isOpen}
          aria-label={isOpen ? 'Collapse section' : 'Expand section'}
          onClick={onToggle}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-brand transition-colors hover:bg-accent/70"
        >
          <ChevronDown className={cn('h-4 w-4 transition-transform', !isOpen && '-rotate-90')} />
        </button>
        <h2 className="m-0 min-w-0 flex-1 text-lg font-semibold">
          <InlineEditText
            value={section.title}
            label="section title"
            isEditable={isEditing}
            maxLength={255}
            onSave={onRename}
          />
        </h2>
        {isHidden && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
            <EyeOff className="h-3 w-3" />
            Hidden from students
          </span>
        )}
        {toggleAllLabel && (
          <button
            type="button"
            onClick={onToggleAll}
            className="shrink-0 border-0 bg-transparent p-0 text-sm text-brand hover:underline"
          >
            {toggleAllLabel}
          </button>
        )}
        {isEditing && <ActionMenu label={`Actions for ${section.title}`} actions={actions} />}
      </header>

      {isOpen && (
        <div className="space-y-3 border-t px-5 pb-5 pt-4">
          <div className="text-sm text-muted-foreground">
            <InlineEditText
              value={section.description ?? ''}
              label="description"
              placeholder="Add a description"
              multiline
              allowEmpty
              maxLength={5000}
              isEditable={isEditing}
              onSave={onDescriptionChange}
            />
          </div>

          {section.items.length > 0 && (
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {section.items.map((item, itemIndex) => (
                <SectionItemRow
                  key={item.id}
                  item={item}
                  isEditing={isEditing}
                  isFirst={itemIndex === 0}
                  isLast={itemIndex === section.items.length - 1}
                  href={itemHref(item)}
                  onRename={(title) => onItemRename(item, title)}
                  onToggleVisible={() => onItemToggleVisible(item)}
                  onMove={(direction) => onItemMove(item, direction)}
                  onRemove={() => onItemRemove(item)}
                />
              ))}
            </ul>
          )}
          {section.items.length === 0 && !isEditing && (
            <p className="m-0 text-sm text-muted-foreground">No content in this section yet.</p>
          )}

          {isEditing && (
            <div className="flex items-center gap-3 pt-1">
              <span className="h-px flex-1 bg-border" />
              <button
                type="button"
                onClick={onAddContent}
                className="inline-flex items-center gap-1.5 rounded-lg border bg-muted px-3.5 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                <Plus className="h-4 w-4" />
                Add content
              </button>
              <span className="h-px flex-1 bg-border" />
            </div>
          )}
        </div>
      )}
    </section>
  )
}