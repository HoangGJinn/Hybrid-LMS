import { ClipboardList, FileText, PenSquare, PlayCircle, type LucideIcon } from 'lucide-react'
import type { ItemType } from '../types/courses.types'

/** Icon, colour and label of each kind of content, shared by the item rows and the "Add content" picker. */
export const ITEM_META: Record<ItemType, { icon: LucideIcon; color: string; label: string }> = {
  DOCUMENT: { icon: FileText, color: 'text-teal-600', label: 'Document' },
  VIDEO: { icon: PlayCircle, color: 'text-rose-600', label: 'Video' },
  ASSIGNMENT: { icon: ClipboardList, color: 'text-orange-600', label: 'Assignment' },
  EXAM: { icon: PenSquare, color: 'text-violet-600', label: 'Exam' },
}