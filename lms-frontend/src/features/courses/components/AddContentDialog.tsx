import type { ChangeEvent } from 'react'
import { Modal } from '@shared/components/Modal'
import { cn } from '@shared/utils/cn'
import { ITEM_META } from '../utils/item-meta'
import type { ItemType } from '../types/courses.types'

type DialogChoice = Exclude<ItemType, 'DOCUMENT'>

interface AddContentDialogProps {
  open: boolean
  /** A document is being uploaded; picking another file waits until it is done. */
  isBusy: boolean
  onClose: () => void
  onPickFile: (file: File) => void
  onPickType: (type: DialogChoice) => void
}

const HINTS: Record<ItemType, string> = {
  DOCUMENT: 'Upload a file for students to read',
  VIDEO: 'Embed a YouTube video',
  ASSIGNMENT: 'Set work that students hand in',
  EXAM: 'Schedule an exam with a question file',
}

const TILE =
  'flex items-start gap-3 rounded-xl border bg-card p-3 text-left transition-colors hover:border-primary/60 hover:bg-accent focus-within:ring-2 focus-within:ring-primary/40'

/** Moodle's "Add an activity or resource" picker, trimmed to what this LMS has. */
export const AddContentDialog = ({
  open,
  isBusy,
  onClose,
  onPickFile,
  onPickType,
}: AddContentDialogProps) => {
  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) onPickFile(file)
  }
  const document = ITEM_META.DOCUMENT

  return (
    <Modal open={open} title="Add content" onClose={onClose}>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={cn(TILE, 'cursor-pointer', isBusy && 'pointer-events-none opacity-50')}>
          <document.icon className={cn('mt-0.5 h-6 w-6 shrink-0', document.color)} />
          <span className="min-w-0">
            <span className="block text-sm font-semibold">{document.label}</span>
            <span className="block text-xs text-muted-foreground">{HINTS.DOCUMENT}</span>
          </span>
          <input type="file" className="sr-only" onChange={handleFile} disabled={isBusy} />
        </label>
        {(['VIDEO', 'ASSIGNMENT', 'EXAM'] as const).map((type) => {
          const { icon: Icon, color, label } = ITEM_META[type]
          return (
            <button key={type} type="button" className={TILE} onClick={() => onPickType(type)}>
              <Icon className={cn('mt-0.5 h-6 w-6 shrink-0', color)} />
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{label}</span>
                <span className="block text-xs text-muted-foreground">{HINTS[type]}</span>
              </span>
            </button>
          )
        })}
      </div>
    </Modal>
  )
}