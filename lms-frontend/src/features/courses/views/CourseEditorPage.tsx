import { toast } from 'sonner'
import { useState } from 'react'
import { useParams } from 'react-router'
import { Plus } from 'lucide-react'
import { AsyncView } from '@shared/components/AsyncView'
import { EmptyState } from '@shared/components/EmptyState'
import { ErrorState } from '@shared/components/ErrorState'
import { Button } from '@shared/components/ui/button'
import { Input } from '@shared/components/ui/input'
import { toAsyncState } from '@shared/utils/async-state'
import { SectionCard } from '../components/SectionCard'
import { useCourseSections } from '../hooks/useCourse'
import { useCreateSection } from '../hooks/useCreateSection'
import { useSaveSections } from '../hooks/useSaveSections'
import { moveItem } from '../utils/move-item'
import type { ItemType, Section } from '../types/courses.types'

/** Course tab of a lecturer's class: the collapsible week cards, with an edit mode. Banner and tabs live in LecturerCourseLayout. */
const CourseEditorPage = () => {
  const { courseId = '' } = useParams()
  const state = toAsyncState(useCourseSections(courseId))
  const saveSections = useSaveSections(courseId)
  const createSection = useCreateSection(courseId)
  // `null` = no "new section" form open; otherwise the title being typed.
  const [newTitle, setNewTitle] = useState<string | null>(null)
  // `null` = read-only view of the server data. While editing, the draft overlays it, so no effect has to copy query data into state.
  const [draft, setDraft] = useState<Section[] | null>(null)
  // Section ids the lecturer collapsed; everything is open by default.
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const editing = draft !== null

  const setSections = (updater: (current: Section[]) => Section[]) =>
    setDraft((current) => (current === null ? current : updater(current)))
  const update = (id: string, patch: Partial<Section>) =>
    setSections((s) => s.map((x) => (x.id === id ? { ...x, ...patch } : x)))
  const addItem = (sec: Section, itemType: ItemType) =>
    update(sec.id, {
      items: [
        ...sec.items,
        {
          id: crypto.randomUUID(),
          sectionId: sec.id,
          itemType,
          title: `New ${itemType.toLowerCase()}`,
          externalUrl: null,
          orderIndex: sec.items.length + 1,
          documentId: null,
          assignmentId: null,
          isCompleted: false,
        },
      ],
    })

  const handleStartEditing = () => setDraft(state.data ?? [])
  const handleCancel = () => {
    setDraft(null)
    setNewTitle(null)
  }
  const handleToggleSection = (id: string) =>
    setCollapsed((c) => ({ ...c, [id]: !c[id] }))
  const handleToggleAll = (sections: Section[]) => {
    const isAllCollapsed = sections.every((s) => collapsed[s.id])
    setCollapsed(Object.fromEntries(sections.map((s) => [s.id, !isAllCollapsed])))
  }
  const handleOpenNewSection = () =>
    setNewTitle(`Week ${(draft?.length ?? 0) + 1}`)
  const handleCreateSection = () => {
    const title = (newTitle ?? '').trim()
    if (title === '') return
    createSection.mutate(title, {
      onSuccess: (section) => {
        setSections((s) => [...s, section])
        setNewTitle(null)
        toast.success('Section added')
      },
    })
  }
  const handleSave = () => {
    if (draft === null) return
    const normalized = draft.map((s, i) => ({
      ...s,
      orderIndex: i + 1,
      items: s.items.map((it, j) => ({ ...it, orderIndex: j + 1 })),
    }))
    saveSections.mutate(normalized, {
      onSuccess: () => {
        toast.success('Course content saved')
        setDraft(null)
      },
    })
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-end gap-2">
        {editing ? (
          <>
            <Button variant="outline" onClick={handleCancel} disabled={saveSections.isPending}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saveSections.isPending}>
              {saveSections.isPending ? 'Saving…' : 'Save changes'}
            </Button>
          </>
        ) : (
          <Button onClick={handleStartEditing} disabled={!state.data}>
            Turn editing on
          </Button>
        )}
      </div>
      {saveSections.error && (
        <ErrorState message={saveSections.error.message} onRetry={handleSave} />
      )}
      <AsyncView state={state}>
        {(serverSections) => {
          const sections = draft ?? serverSections
          const isAllCollapsed = sections.every((s) => collapsed[s.id])
          return (
            <div className="space-y-5">
              {sections.length === 0 && (
                <EmptyState
                  title="No sections yet"
                  description="Turn editing on to add the first section."
                />
              )}
              {sections.map((sec, i) => (
                <SectionCard
                  key={sec.id}
                  section={sec}
                  isOpen={!collapsed[sec.id]}
                  isEditing={editing}
                  toggleAllLabel={
                    i === 0 ? (isAllCollapsed ? 'Expand all' : 'Collapse all') : undefined
                  }
                  onToggle={() => handleToggleSection(sec.id)}
                  onToggleAll={() => handleToggleAll(sections)}
                  onTitleChange={(title) => update(sec.id, { title })}
                  onItemsChange={(items) => update(sec.id, { items })}
                  onAddItem={(type) => addItem(sec, type)}
                  onMoveUp={() => setSections((s) => moveItem(s, i, -1))}
                  onMoveDown={() => setSections((s) => moveItem(s, i, 1))}
                  onDelete={() => setSections((s) => s.filter((x) => x.id !== sec.id))}
                />
              ))}
              {createSection.error && (
                <ErrorState
                  message={createSection.error.message}
                  onRetry={handleCreateSection}
                />
              )}
              {editing && newTitle === null && (
                <Button variant="outline" className="w-full" onClick={handleOpenNewSection}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add section
                </Button>
              )}
              {editing && newTitle !== null && (
                <form
                  className="flex flex-wrap items-center gap-2 rounded-2xl border bg-card p-4"
                  onSubmit={(e) => {
                    e.preventDefault()
                    handleCreateSection()
                  }}
                >
                  <Input
                    aria-label="New section title"
                    autoFocus
                    maxLength={255}
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="min-w-0 flex-1"
                  />
                  <Button type="submit" disabled={createSection.isPending || newTitle.trim() === ''}>
                    {createSection.isPending ? 'Adding…' : 'Add'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setNewTitle(null)} disabled={createSection.isPending}>
                    Cancel
                  </Button>
                </form>
              )}
            </div>
          )
        }}
      </AsyncView>
    </div>
  )
}

export default CourseEditorPage