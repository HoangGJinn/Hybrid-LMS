import { ArrowDown, ArrowUp, Eye, EyeOff, Trash2 } from 'lucide-react'
import { cn } from '@shared/utils/cn'
import { ITEM_META } from '../utils/item-meta'
import type { SectionItem } from '../types/courses.types'
import { ActionMenu, type MenuAction } from './ActionMenu'
import { InlineEditText } from './InlineEditText'

interface SectionItemRowProps {
  item: SectionItem
  isEditing: boolean
  isFirst: boolean
  isLast: boolean
  href: string | null
  onRename: (title: string) => void
  onToggleVisible: () => void
  onMove: (direction: -1 | 1) => void
  onRemove: () => void
}

/** One document / video / assignment / exam in a section. In edit mode: pencil for the name and a ⋮ menu. */
export const SectionItemRow = ({
  item,
  isEditing,
  isFirst,
  isLast,
  href,
  onRename,
  onToggleVisible,
  onMove,
  onRemove,
}: SectionItemRowProps) => {
  const { icon: Icon, color, label } = ITEM_META[item.itemType]
  const isHidden = item.isVisible === false

  const actions: MenuAction[] = [
    {
      label: isHidden ? 'Show to students' : 'Hide from students',
      icon: isHidden ? Eye : EyeOff,
      onSelect: onToggleVisible,
    },
    { label: 'Move up', icon: ArrowUp, onSelect: () => onMove(-1), disabled: isFirst },
    { label: 'Move down', icon: ArrowDown, onSelect: () => onMove(1), disabled: isLast },
    { label: item.itemType === 'VIDEO' ? 'Delete' : 'Delete…', icon: Trash2, onSelect: onRemove, danger: true },
  ]

  return (
    <li
      className={cn(
        'flex items-center gap-3 rounded-xl border bg-card px-3.5 py-2.5',
        isHidden && 'bg-muted/40',
      )}
    >
      <Icon className={cn('h-5 w-5 shrink-0', color, isHidden && 'opacity-50')} />
      <div className={cn('min-w-0 flex-1 text-sm', isHidden && 'text-muted-foreground')}>
        <InlineEditText
          value={item.title}
          label={`${label.toLowerCase()} name`}
          isEditable={isEditing}
          href={href}
          maxLength={255}
          onSave={onRename}
          className="text-brand"
        />
      </div>
      {isHidden && (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          <EyeOff className="h-3 w-3" />
          Hidden
        </span>
      )}
      <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">{label}</span>
      {isEditing && <ActionMenu label={`Actions for ${item.title}`} actions={actions} />}
    </li>
  )
}