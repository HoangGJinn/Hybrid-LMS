import { toast } from 'sonner'
import { useState } from 'react'
import { useParams } from 'react-router'
import { Plus } from 'lucide-react'
import { useUploadDocument, validateDocumentFile } from '@features/documents'
import { AsyncView } from '@shared/components/AsyncView'
import { EmptyState } from '@shared/components/EmptyState'
import { ErrorState } from '@shared/components/ErrorState'
import { Button } from '@shared/components/ui/button'
import { Input } from '@shared/components/ui/input'
import { toAsyncState } from '@shared/utils/async-state'
import { RemoveDocumentConfirm } from '../components/RemoveDocumentConfirm'
import { SectionCard } from '../components/SectionCard'
import { useCourseSections } from '../hooks/useCourse'
import { useCreateSection } from '../hooks/useCreateSection'
import { useSaveSections } from '../hooks/useSaveSections'
import { moveItem } from '../utils/move-item'
import { removeItem } from '../utils/remove-item'
import type { ItemType, Section, SectionItem } from '../types/courses.types'

/** Course tab of a lecturer's class: the collapsible week cards, with an edit mode. Banner and tabs live in LecturerCourseLayout. */
const CourseEditorPage = () => {
  const { courseId = '' } = useParams()
  const state = toAsyncState(useCourseSections(courseId))
  const saveSections = useSaveSections(courseId)
  const createSection = useCreateSection(courseId)
  const uploadDocument = useUploadDocument()
  // `null` = no "new section" form open; otherwise the title being typed.
  const [newTitle, setNewTitle] = useState<string | null>(null)
  // `null` = read-only view of the server data. While editing, the draft overlays it, so no effect has to copy query data into state.
  const [draft, setDraft] = useState<Section[] | null>(null)
  // Section ids the lecturer collapsed; everything is open by default.
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  // Document waiting for the lecturer's confirmation (UC-30), with the section it belongs to.
  const [pendingRemoval, setPendingRemoval] = useState<SectionItem | null>(null)
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

  /** UC-29: upload the file, then add it to the draft section; "Save changes" publishes it. */
  const addDocument = (sectionId: string, file: File) => {
    const error = validateDocumentFile(file)
    if (error) {
      toast.error(error)
      return
    }
    uploadDocument.mutate(
      { classId: courseId, file },
      {
        onSuccess: (document) => {
          // Functional update: the section may have changed while the upload was running.
          setSections((current) =>
            current.map((x) =>
              x.id === sectionId
                ? {
                    ...x,
                    items: [
                      ...x.items,
                      {
                        id: crypto.randomUUID(),
                        sectionId,
                        itemType: 'DOCUMENT',
                        title: document.title,
                        externalUrl: null,
                        orderIndex: x.items.length + 1,
                        documentId: document.id,
                        assignmentId: null,
                        isCompleted: false,
                      },
                    ],
                  }
                : x,
            ),
          )
          toast.success('Document uploaded. Save changes to publish it.')
        },
        onError: (uploadError) => toast.error(uploadError.message),
      },
    )
  }

  const handleConfirmRemoval = () => {
    if (pendingRemoval === null) return
    setSections((current) =>
      removeItem(current, pendingRemoval.sectionId, pendingRemoval.id),
    )
    setPendingRemoval(null)
    toast.success('Document removed. Save changes to apply.')
  }

  const handleStartEditing = () => setDraft(state.data ?? [])
  const handleCancel = () => {
    setDraft(null)
    setPendingRemoval(null)
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
                  onDescriptionChange={(description) => update(sec.id, { description })}
                  onItemsChange={(items) => update(sec.id, { items })}
                  onAddItem={(type) => addItem(sec, type)}
                  onAddDocument={(file) => addDocument(sec.id, file)}
                  onRemoveDocument={setPendingRemoval}
                  isUploadingDocument={uploadDocument.isPending}
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
      <RemoveDocumentConfirm
        item={pendingRemoval}
        onConfirm={handleConfirmRemoval}
        onClose={() => setPendingRemoval(null)}
      />
    </div>
  )
}

export default CourseEditorPage