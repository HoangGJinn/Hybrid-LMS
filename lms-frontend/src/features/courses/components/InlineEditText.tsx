import { useState, type KeyboardEvent } from 'react'
import { Link } from 'react-router'
import { Pencil } from 'lucide-react'
import { cn } from '@shared/utils/cn'

interface InlineEditTextProps {
  value: string
  /** Called with the trimmed text once the lecturer confirms (Enter or leaving the field). */
  onSave: (next: string) => void
  /** Shows the pencil. Outside edit mode the text is plain (or a link). */
  isEditable: boolean
  /** Accessible name of the pencil button and the field, e.g. "section title". */
  label: string
  multiline?: boolean
  placeholder?: string
  maxLength?: number
  allowEmpty?: boolean
  /** Makes the text a link (view and edit mode alike). */
  href?: string | null
  className?: string
}

const FIELD =
  'w-full rounded-md border border-primary/60 bg-background px-2 py-1 text-sm text-foreground outline-none ring-2 ring-primary/20'

/** Moodle-style inline rename: a pencil next to the text turns it into a field; Enter saves, Esc cancels. */
export const InlineEditText = ({
  value,
  onSave,
  isEditable,
  label,
  multiline = false,
  placeholder = '',
  maxLength,
  allowEmpty = false,
  href = null,
  className,
}: InlineEditTextProps) => {
  // `null` = not editing; otherwise the text being typed.
  const [draft, setDraft] = useState<string | null>(null)

  const commit = () => {
    if (draft === null) return
    const next = draft.trim()
    setDraft(null)
    if (next === value.trim()) return
    if (next === '' && !allowEmpty) return
    onSave(next)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (event.key === 'Escape') {
      setDraft(null)
      return
    }
    // A description is multi-line, so only Ctrl/Cmd+Enter saves it.
    if (event.key === 'Enter' && (!multiline || event.ctrlKey || event.metaKey)) {
      event.preventDefault()
      commit()
    }
  }

  if (draft !== null) {
    const shared = {
      autoFocus: true,
      value: draft,
      maxLength,
      'aria-label': label,
      placeholder,
      onBlur: commit,
      onKeyDown: handleKeyDown,
    }
    return multiline ? (
      <textarea
        {...shared}
        rows={4}
        onChange={(event) => setDraft(event.target.value)}
        className={cn(FIELD, 'resize-y')}
      />
    ) : (
      <input {...shared} onChange={(event) => setDraft(event.target.value)} className={FIELD} />
    )
  }

  if (!isEditable && value === '') return null

  const text = (
    <span className={cn(multiline && 'whitespace-pre-line', value === '' && 'italic text-muted-foreground', className)}>
      {value === '' ? placeholder : value}
    </span>
  )

  return (
    <span className="inline-flex min-w-0 items-start gap-1.5">
      {href ? (
        <Link to={href} className="min-w-0 text-inherit no-underline hover:underline">
          {text}
        </Link>
      ) : (
        text
      )}
      {isEditable && (
        <button
          type="button"
          aria-label={`Edit ${label}`}
          onClick={() => setDraft(value)}
          className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      )}
    </span>
  )
}